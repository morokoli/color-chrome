import { FC, useMemo, useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Dropdown } from "../FigmaManager/Dropdown"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useSetActiveWorkspace } from "@/v2/api/workspaces.api"
import type { Workspace } from "@/v2/types/general"
import { useToast } from "@/v2/hooks/useToast"

function invalidateWorkspaceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["folders"] })
  queryClient.invalidateQueries({ queryKey: ["all-color-data"] })
  queryClient.invalidateQueries({ queryKey: ["colors-and-palettes"] })
}

interface WorkspaceSelectorProps {
  userToken: string | undefined
}

export const WorkspaceSelector: FC<WorkspaceSelectorProps> = ({ userToken }) => {
  const { state, dispatch } = useGlobalState()
  const queryClient = useQueryClient()
  const toast = useToast()
  const setActiveWorkspaceMutation = useSetActiveWorkspace()
  const [isSwitching, setIsSwitching] = useState(false)

  const workspaces = state.workspaces
  const activeWorkspaceId = state.activeWorkspaceId

  const selectedWorkspace = useMemo(
    () => workspaces.find((ws) => ws._id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  )

  const handleSelect = useCallback(
    async (workspace: Workspace) => {
      if (!userToken || workspace._id === activeWorkspaceId || isSwitching) return

      setIsSwitching(true)
      try {
        await setActiveWorkspaceMutation.mutateAsync(workspace._id)
        dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: workspace._id })
        invalidateWorkspaceQueries(queryClient)
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string; err?: string } } })?.response?.data
            ?.message ||
          (err as { response?: { data?: { err?: string } } })?.response?.data?.err ||
          "Failed to switch workspace"
        toast.display("error", message)
      } finally {
        setIsSwitching(false)
      }
    },
    [
      userToken,
      activeWorkspaceId,
      isSwitching,
      setActiveWorkspaceMutation,
      dispatch,
      queryClient,
      toast,
    ],
  )

  if (!userToken) {
    return null
  }

  return (
    <div className="pb-2">
      <p className="text-[12px] text-gray-800 mb-1">Workspace</p>
      <Dropdown<Workspace>
        selected={selectedWorkspace}
        items={workspaces}
        compact
        renderItem={(workspace) => (
          <span className="text-[12px] text-gray-800 truncate block">
            {workspace.name}
            {workspace.isPersonal ? (
              <span className="text-gray-400 ml-1">(Personal)</span>
            ) : null}
          </span>
        )}
        renderSelected={(workspace) => (
          <span className="text-[12px] text-gray-800 truncate">
            {isSwitching ? "Switching..." : workspace.name}
          </span>
        )}
        getSearchText={(workspace) => workspace.name}
        onSelect={handleSelect}
        placeholder={workspaces.length === 0 ? "Loading workspaces..." : "Select workspace"}
        isSearchable={workspaces.length > 5}
        width="100%"
      />
    </div>
  )
}

export { invalidateWorkspaceQueries }
