//為求方便，程式註解由AI生成，程式本體由我自行撰寫
// netlify/functions/translate.js
exports.handler = async function (event, context) {
  // 只允許 POST 請求
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // 從 Netlify 環境變數安全地讀取金鑰
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-12b-it:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        return { statusCode: response.status, body: JSON.stringify({ error: `API Error: ${response.statusText}`, details: errorBody }) };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Netlify Function Error', details: error.message }),
    };
  }
};