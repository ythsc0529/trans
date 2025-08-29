// Import the GoogleGenerativeAI library
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { text, sourceLang, targetLang, mode } = JSON.parse(event.body);

        // Get API Key from environment variables
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            throw new Error("API Key not found.");
        }

        // Initialize the Generative AI client
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt;
        const sourceLanguage = sourceLang === 'auto' ? '自動偵測的語言' : sourceLang;

        switch (mode) {
            case 'learning':
                prompt = `
                你現在是一個名為 husonAI 的專業語言學習助理。請遵循以下步驟：
                1.  將以下文字從 **${sourceLanguage}** 翻譯成 **${targetLang}**。
                2.  在翻譯後，提供一個詳細的「學習筆記」區塊。
                3.  在學習筆記中，包含兩個子標題：
                    -   **文法重點**: 摘要原文中 1-2 個最重要的文法概念，並用**${targetLang}**和繁體中文解釋。
                    -   **核心單字**: 列出 3-5 個關鍵單字或片語，提供它們的詞性、在**${targetLang}**中的意思，以及一個簡短的例句。
                
                請嚴格用以下的 JSON 格式回覆，不要加任何 markdown 符號:
                {
                  "translation": "你的翻譯結果",
                  "analysis": "你的學習筆記內容，可以使用 \n 換行"
                }

                要翻譯的文字是：
                "${text}"
                `;
                break;
            case 'word_lookup':
                prompt = `
                你現在是一個名為 husonAI 的專業字典。
                針對使用者提供的單字或片語，提供詳細的分析。
                請包含以下資訊：
                -   **詞性**: (e.g., 名詞, 動詞)
                -   **發音**: (如果適用，例如 KK 音標或羅馬拼音)
                -   **定義**: 提供 1-3 個最常見的中文意思。
                -   **用法/情境**: 簡短說明這個詞通常在什麼情況下使用。
                -   **例句**: 提供至少 2 個包含此單字/片語的例句，並附上中文翻譯。

                請嚴格用以下的 JSON 格式回覆，不要加任何 markdown 符號:
                {
                  "translation": "將單字/片語本身作為翻譯結果",
                  "analysis": "你的詳細分析內容，可以使用 \n 換行"
                }
                
                要查詢的單字/片語是 (${sourceLanguage}):
                "${text}"
                `;
                break;
            default: // 'translate' mode
                prompt = `
                你現在是一個名為 husonAI 的專業翻譯引擎。
                請將以下文字從 **${sourceLanguage}** 翻譯成 **${targetLang}**。
                只需要提供翻譯後的文字，不要有任何額外的解釋或前言。

                請嚴格用以下的 JSON 格式回覆，不要加任何 markdown 符號:
                {
                  "translation": "你的翻譯結果",
                  "analysis": ""
                }

                要翻譯的文字是：
                "${text}"
                `;
                break;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        // Safely parse the JSON response from the AI
        let parsedResponse;
        try {
            // Remove potential markdown code block fences
            const cleanedText = responseText.replace(/```json\n/g, '').replace(/\n```/g, '');
            parsedResponse = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse AI response:", responseText);
            throw new Error("AI 回應格式錯誤，請稍後再試。");
        }

        return {
            statusCode: 200,
            body: JSON.stringify(parsedResponse),
        };

    } catch (error) {
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || '伺服器內部錯誤' }),
        };
    }
};