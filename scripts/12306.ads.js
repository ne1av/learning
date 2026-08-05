/**
 * 12306
 * Quantumult X
 *
 * 接口：
 * https://ad.12306.cn/ad/ser/getAdList
 *
 * 已知 placementNo：
 * G0054 - 首頁酒店及租車廣告
 * 0007  - 啟動廣告
 *
 * Version: 2.0.0
 */

const VERSION = "2.0.0";

function parseRequestBody() {
    if (
        typeof $request === "undefined" ||
        typeof $request.body !== "string" ||
        !$request.body.trim()
    ) {
        return {};
    }

    try {
        return JSON.parse($request.body);
    } catch (error) {
        console.log(
            `[12306 No Ads ${VERSION}] 請求體解析失敗：${error.message}`
        );

        return {};
    }
}

function createResponse() {
    return {
        code: "00",
        materialsList: [],
        rid: "",
        advertParam: {
            skipTime: 0,
            showSkipBtn: 1,
            skipTimeAgain: 0,
            chacheTime: 300000,
            fixedscreen: 0,
            isDefault: 0,
            displayNumDi: 0,
            index: 0
        }
    };
}

const requestBody = parseRequestBody();
const placementNo = String(requestBody.placementNo || "").trim();
const responseBody = createResponse();

console.log(
    `[12306 No Ads ${VERSION}] placementNo=${placementNo || "unknown"}`
);

$done({
    status: "HTTP/1.1 200 OK",
    headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "no-store"
    },
    body: JSON.stringify(responseBody)
});
