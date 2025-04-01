/* eslint-disable @typescript-eslint/no-explicit-any */
import { useGlobalState } from "@/v2/hooks/useGlobalState";
import { useToast } from "@/v2/hooks/useToast";
import { useAPI } from "@/v2/hooks/useAPI";
import { config } from "@/v2/others/config";
import { CheckSheetValidRequest, CheckSheetValidResponse } from "@/v2/types/api";

import { RowData } from "@/v2/types/general";

const Left: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const toast = useToast();
  const { files } = state;

  const checkSheetValid = useAPI<CheckSheetValidRequest, CheckSheetValidResponse>({
    url: config.api.endpoints.checkSheetValid,
    method: "POST",
    jwtToken: state.user?.jwtToken,
  });

  const handleColorClick = async (fileId: string, color: string) => {
    const fileData = files.find((f) => f.spreadsheetId === fileId);
    if (!fileData) return;

    try {
      const response = await checkSheetValid.call({
        spreadsheetId: fileId,
        sheetId: fileData.sheets?.[0].id,
        sheetName: `'${fileData.sheets?.[0].name}'`,
      });

      const parsed: RowData[] = response.sheetData.parsed;

      // шукаємо відповідний рядок
      const matchedRow = parsed.find((row) => row.hex === color);

      const slashNaming =
        matchedRow?.slashNaming ||
        matchedRow?.additionalColumns?.find((col) => col.name === "slashNaming")?.value ||
        "";

      dispatch({
        type: "ADD_SELECTED_COLOR_FROM_FILE",
        payload: { color, slashNaming },
      });
    } catch (err) {
      toast.display("error", "Failed to load sheet data");
      console.error("Sheet load error:", err);
    }
  };

  return (
    <div className="relative min-h-[100vh] overflow-y-auto p-4">
      {files.map((item) => (
        <div key={item.spreadsheetId} className="mb-4">
          <div className="flex mb-2">
            <input
              type="text"
              placeholder={`${item.fileName} - ${item.sheets?.[0]?.name || ""}`}
              className="border p-2 flex-grow"
            />
            <button
              className="border p-2"
              onClick={() =>
                dispatch({ type: "REMOVE_FILES", payload: item.spreadsheetId })
              }
            >
              ✖
            </button>
          </div>

          {/* Color Grid per file */}
          <div className="w-[355px] h-[284px] relative color-history">
            <div className="flex flex-wrap content-baseline gap-[1px] color-history-container">
              {(item.colorHistory || [])
                .slice()
                .reverse()
                .map((color, index) => (
                  <div
                    key={color + index}
                    style={{ backgroundColor: color }}
                    className="w-[20px] h-[21px] cursor-pointer"
                    onClick={() => handleColorClick(item.spreadsheetId, color)}
                  />
                ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Left;
