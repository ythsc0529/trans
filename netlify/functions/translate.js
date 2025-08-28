// netlify/functions/translate.js

const fetch = require('node-fetch');

// 從 Netlify 的環境變數中讀取 API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 幫助函數，用於建立請求主體
const createPrompt = (mode, text, sourceLang, targetLang) => {
    // 檢查是否為單字或短片語查詢
    const isSingleWordQuery = text.trim().split(/\s+/).length <= 3;

    if (isSingleWordQuery && mode !== 'translateOnly') {
        return `你是一個專業的語言學家和詞典。請詳細解釋以下的單字或片語： "${text}"。
        請用目標語言 "${targetLang}" 來解釋，並包含以下內容：
        1.  詞性 (Part of Speech)。
        2.  主要意思 (Main Meanings)，列出1-3個。
        3.  提供 2 個使用 "${text}" 的例句，並附上 "${targetLang}" 的翻譯。
        請使用 Markdown 格式化你的回答，例如使用粗體標示標題。`;
    }
    
    if (mode === 'learning') {
        return `你是一個專業的語言老師，擅長用清晰易懂的方式教學。
        請先將以下從 "${sourceLang}" 翻譯成 "${targetLang}" 的文本：
        ---
        ${text}
        ---
        翻譯完成後，請在下方提供一個「學習筆記」區塊。
        在這個區塊中，根據翻譯的內容，摘要出 2-3 個重要的「文法重點」和 3-5 個「核心單字」。
        -   文法重點需要簡短解釋。
        -   核心單字需要附上詞性和中文意思。
        請嚴格按照以下 JSON 格式輸出，不要有任何多餘的文字：
        {
          "translation": "你的翻譯結果",
          "learning_notes": {
            "grammar": [
              { "point": "文法重點1", "explanation": "解釋1" },
              { "point": "文法重點2", "explanation": "解釋2" }
            ],
            "vocabulary": [
              { "word": "單字1", "pos": "詞性", "meaning": "意思" },
              { "word": "單字2", "pos": "詞性", "meaning": "意思" }
            ]
          }
        }`;
    }

    // 預設為一般翻譯
    return `請將以下 "${sourceLang}" 文本翻譯成 "${targetLang}"。請盡量保持語氣和上下文的流暢與自然。
    文本： "${text}"
    只要直接回傳翻譯後的文本即可，不要包含任何額外的說明或引號。`;
};


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { text, sourceLang, targetLang, mode } = JSON.parse(event.body);

        if (!text) {
            return { statusCode: 400, body: 'Text is required.' };
        }

        const prompt = createPrompt(mode, text, sourceLang, targetLang);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        const resultText = data.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            body: JSON.stringify({ result: resultText }),
        };

    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'An internal error occurred.' }) };
    }
};