import { FC, useMemo, useState, useCallback } from "react"
import { Plus } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { Dropdown } from "../FigmaManager/Dropdown"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import {
  createWorkspace,
  useEntitlements,
  useSetActiveWorkspace,
  ENTITLEMENTS_QUERY_KEY,
} from "@/v2/api/workspaces.api"
import type { Workspace } from "@/v2/types/general"
import { useToast } from "@/v2/hooks/useToast"
import { openWebAppPlansUpgrade } from "@/v2/helpers/upgrade"
import { isAtWorkspaceLimit, isWorkspaceLimitError } from "@/v2/helpers/planLimit"

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
  const { data: entitlements } = useEntitlements()
  const [isSwitching, setIsSwitching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [isCreatingLoading, setIsCreatingLoading] = useState(false)

  const workspaces = state.workspaces
  const activeWorkspaceId = state.activeWorkspaceId

  const selectedWorkspace = useMemo(
    () => workspaces.find((ws) => ws._id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  )

  const atWorkspaceLimit = isAtWorkspaceLimit(entitlements)

  const redirectToUpgrade = useCallback(() => {
    toast.display("error", "Workspace limit reached. Upgrade to create more.")
    openWebAppPlansUpgrade(userToken)
  }, [toast, userToken])

  const handleStartCreate = useCallback(() => {
    if (!userToken) return
    // Limits are prefetched via useEntitlements — check instantly on click
    if (atWorkspaceLimit) {
      redirectToUpgrade()
      return
    }
    setIsCreating(true)
  }, [userToken, atWorkspaceLimit, redirectToUpgrade])

  const handleCreateWorkspace = useCallback(async () => {
    const name = newWorkspaceName.trim()
    if (!name || !userToken) return
    setIsCreatingLoading(true)
    try {
      const response = await createWorkspace(userToken, name)
      const workspace = response.workspace
      const id = workspace?._id || (workspace as { id?: string })?.id
      if (!id) {
        toast.display("error", "Failed to create workspace")
        return
      }
      const created: Workspace = {
        ...workspace,
        _id: id,
        role: workspace.role || response.membership?.role,
      }

      const nextWorkspaces = [...workspaces, created]
      dispatch({
        type: "SET_WORKSPACES",
        payload: {
          workspaces: nextWorkspaces,
          activeWorkspaceId: id,
          syncFromBackend: true,
        },
      })

      try {
        await setActiveWorkspaceMutation.mutateAsync(id)
      } catch {
        // Local switch already applied; server sync can catch up later
      }
      dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: id })
      invalidateWorkspaceQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_QUERY_KEY })

      toast.display("success", "Workspace created")
      setNewWorkspaceName("")
      setIsCreating(false)
    } catch (err: unknown) {
      if (isWorkspaceLimitError(err)) {
        setIsCreating(false)
        setNewWorkspaceName("")
        queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_QUERY_KEY })
        redirectToUpgrade()
        return
      }
      const message =
        (err as { response?: { data?: { message?: string; err?: string } } })?.response?.data
          ?.err ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to create workspace"
      toast.display("error", message)
    } finally {
      setIsCreatingLoading(false)
    }
  }, [
    newWorkspaceName,
    userToken,
    workspaces,
    dispatch,
    setActiveWorkspaceMutation,
    queryClient,
    toast,
    redirectToUpgrade,
  ])

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

  const renderFooter = useCallback(() => {
    if (isCreating) {
      return (
        <div className="p-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Workspace name"
            className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateWorkspace()
              if (e.key === "Escape") {
                setIsCreating(false)
                setNewWorkspaceName("")
              }
            }}
          />
          <button
            type="button"
            onClick={handleCreateWorkspace}
            disabled={!newWorkspaceName.trim() || isCreatingLoading}
            className="px-3 py-1.5 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingLoading ? "..." : "Save"}
          </button>
        </div>
      )
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleStartCreate()
        }}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Plus size={14} />
        Create
      </button>
    )
  }, [
    isCreating,
    newWorkspaceName,
    isCreatingLoading,
    handleCreateWorkspace,
    handleStartCreate,
  ])

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
        renderFooter={renderFooter}
        footerExpanded={isCreating}
        openUpward
      />
    </div>
  )
}

export { invalidateWorkspaceQueries }
