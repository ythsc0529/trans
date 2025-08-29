document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素宣告 ---
    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const swapLangBtn = document.querySelector('.swap-lang-btn');
    const textInput = document.getElementById('text-input');
    const textOutput = document.getElementById('text-output');
    const charCounter = document.querySelector('.char-counter');
    const loader = document.getElementById('husonai-loader');
    
    const detailedResultSection = document.getElementById('detailed-result-section');
    const resultWordEl = document.getElementById('result-word');
    const wordDetailsContent = document.getElementById('word-details-content');
    const addToNotebookBtn = document.getElementById('add-to-notebook-btn');

    const openNotebookBtn = document.getElementById('open-notebook-btn');
    const notebookModal = document.getElementById('notebook-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const notebookList = document.getElementById('notebook-list');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const clearNotebookBtn = document.getElementById('clear-notebook-btn');

    const quizModal = document.getElementById('quiz-modal');
    const closeQuizBtn = document.getElementById('close-quiz-btn');
    const quizBody = document.getElementById('quiz-body');

    // --- 應用程式狀態與常數 ---
    // 不再需要 API Key，API URL 改為指向我們的後端函式
    const NETLIFY_FUNCTION_URL = '/.netlify/functions/translate';
    let notebook = JSON.parse(localStorage.getItem('husonAI_notebook')) || [];
    let currentQuizState = {};

    // 提供一些常用語言選項
    const languages = {
        "en": "English (英文)", "zh-TW": "Traditional Chinese (繁體中文)", "zh-CN": "Simplified Chinese (簡體中文)",
        "ja": "Japanese (日文)", "ko": "Korean (韓文)", "es": "Spanish (西班牙文)", "fr": "French (法文)",
        "de": "German (德文)", "ru": "Russian (俄文)", "th": "Thai (泰文)", "vi": "Vietnamese (越南文)"
    };

    // --- 核心功能函式 ---

    /**
     * 填充語言選擇下拉選單
     */
    function populateLanguages() {
        for (const [code, name] of Object.entries(languages)) {
            sourceLangSelect.add(new Option(name, code));
            targetLangSelect.add(new Option(name, code));
        }
        targetLangSelect.value = 'zh-TW'; // 預設目標語言為繁體中文
    }

    /**
     * 呼叫 Gemini API 的主要函式
     * @param {string} prompt - 傳送給 AI 的指令
     */
    async function callHusonAI(prompt) {
        loader.style.display = 'block';
        textOutput.classList.add('loading-placeholder');
        textOutput.textContent = '';
        detailedResultSection.classList.add('hidden');

        try {
            const response = await fetch(NETLIFY_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt }),
            });

            if (!response.ok) {
                // 嘗試讀取後端錯誤訊息
                let errData = {};
                try { errData = await response.json(); } catch (_) { errData = { error: response.statusText }; }
                throw new Error(`後端函式錯誤: ${errData.error || response.statusText}`);
            }

            const data = await response.json();

            // 後端會原樣回傳 Gemini 的回應結構，正常取出文字
            const aiResponse = (data && data.candidates && data.candidates[0] && data.candidates[0].content
                && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text)
                ? data.candidates[0].content.parts[0].text
                : JSON.stringify({ error: '後端回傳格式異常' });

            return aiResponse;

        } catch (error) {
            console.error("呼叫 husonAI 時發生錯誤:", error);
            return JSON.stringify({ error: "翻譯時發生錯誤。請稍後再試。" });
        } finally {
            loader.style.display = 'none';
            textOutput.classList.remove('loading-placeholder');
        }
    }

    /**
     * 處理翻譯邏輯
     */
    async function handleTranslation() {
        const text = textInput.value.trim();
        if (!text) return;

        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;
        const sourceLangName = sourceLang === 'auto' ? 'auto-detect' : languages[sourceLang];
        const targetLangName = languages[targetLang];

        // 判斷是單字還是句子 (簡單判斷)
        const isSingleWord = !text.includes(' ') && text.length < 25;
        let prompt;

        if (isSingleWord) {
            prompt = `
                你是一個名為 husonAI 的專業字典 AI。
                使用者正在查詢單字或片語: "${text}"。
                請從 ${sourceLangName} 翻譯成 ${targetLangName}。
                請以繁體中文提供一個詳細的 JSON 格式分析報告。
                JSON 物件必須包含以下結構:
                {
                  "translation": "最直接的翻譯結果",
                  "original_word": "${text}",
                  "definitions": [
                    {
                      "part_of_speech": "詞性 (例如: 名詞, 動詞)",
                      "meaning": "這個詞性下的中文意思",
                      "example_sentence": "使用該單字的英文例句",
                      "example_translation": "例句的中文翻譯"
                    }
                  ],
                  "synonyms": ["相似詞1", "相似詞2"]
                }
                如果輸入的不是一個有效的單字，請回傳一個包含 "error" 鍵的 JSON 物件。
            `;
        } else {
            prompt = `
                你是一個名為 husonAI 的專業翻譯引擎。
                請將以下文字從 ${sourceLangName} 翻譯成 ${targetLangName}。
                請只提供翻譯後的文字，不要包含任何額外的解釋或客套話。
                要翻譯的文字: "${text}"
            `;
        }

        const rawResponse = await callHusonAI(prompt);
        
        try {
            // 首先嘗試解析為 JSON (單字查詢)
            const jsonData = JSON.parse(rawResponse);
            if (jsonData.error) {
                textOutput.textContent = jsonData.error;
                detailedResultSection.classList.add('hidden');
            } else {
                displayDetailedResults(jsonData);
            }
        } catch (e) {
            // 如果解析失敗，則為句子翻譯
            textOutput.textContent = rawResponse.trim();
            detailedResultSection.classList.add('hidden');
        }
    }

    /**
     * 顯示單字/片語的詳細結果
     * @param {object} data - 從 API 取得的 JSON 資料
     */
    function displayDetailedResults(data) {
        textOutput.textContent = data.translation;
        resultWordEl.textContent = data.original_word;

        let detailsHTML = '';
        if (data.definitions) {
            data.definitions.forEach(def => {
                detailsHTML += `
                    <div class="detail-block">
                        <p class="pos">${def.part_of_speech}</p>
                        <h3>${def.meaning}</h3>
                        <ul>
                            <li><strong>例句：</strong> ${def.example_sentence}</li>
                            <li><strong>翻譯：</strong> ${def.example_translation}</li>
                        </ul>
                    </div>
                `;
            });
        }

        if (data.synonyms && data.synonyms.length > 0) {
            detailsHTML += `
                <div class="detail-block">
                    <h3>相似單字</h3>
                    <div class="synonyms-container">
                        ${data.synonyms.map(syn => `<span class="synonym-tag">${syn}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        wordDetailsContent.innerHTML = detailsHTML;
        detailedResultSection.classList.remove('hidden');

        // 為新的相似詞標籤添加事件監聽器
        document.querySelectorAll('.synonym-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                textInput.value = tag.textContent;
                handleTranslation();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    /**
     * 渲染筆記本中的單字列表
     */
    function renderNotebook() {
        notebookList.innerHTML = '';
        if (notebook.length === 0) {
            notebookList.innerHTML = '<li>你的筆記是空的。查詢單字後點擊 "加入筆記" 來收藏！</li>';
            startQuizBtn.disabled = true;
        } else {
            startQuizBtn.disabled = false;
            notebook.forEach((item, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span><strong>${item.word}</strong>: ${item.translation}</span>
                    <button class="delete-word-btn" data-index="${index}" title="刪除"><i class="fas fa-trash-alt"></i></button>
                `;
                notebookList.appendChild(li);
            });
        }
    }

    /**
     * 將單字儲存到筆記本
     */
    function saveToNotebook() {
        const word = resultWordEl.textContent;
        const translation = textOutput.textContent;

        if (word && !notebook.some(item => item.word.toLowerCase() === word.toLowerCase())) {
            notebook.push({ word, translation });
            localStorage.setItem('husonAI_notebook', JSON.stringify(notebook));
            alert(`"${word}" 已成功加入筆記！`);
            renderNotebook();
        } else if (word) {
            alert(`"${word}" 已經在你的筆記中了。`);
        }
    }
    
    // --- 測驗功能 ---
    
    function startQuiz() {
        if (notebook.length < 4) {
            alert("筆記中至少需要4個單字才能開始測驗！");
            return;
        }
        notebookModal.classList.add('hidden');
        quizModal.classList.remove('hidden');
        generateQuizQuestion();
    }

    function generateQuizQuestion() {
        const questionIndex = Math.floor(Math.random() * notebook.length);
        const correctEntry = notebook[questionIndex];
        
        const incorrectOptions = [];
        while (incorrectOptions.length < 3) {
            const randomIndex = Math.floor(Math.random() * notebook.length);
            if (randomIndex !== questionIndex && !incorrectOptions.some(item => item.word === notebook[randomIndex].word)) {
                incorrectOptions.push(notebook[randomIndex]);
            }
        }
        
        const options = [...incorrectOptions.map(item => item.translation), correctEntry.translation];
        options.sort(() => Math.random() - 0.5); // 洗牌

        currentQuizState = {
            questionWord: correctEntry.word,
            correctAnswer: correctEntry.translation
        };

        quizBody.innerHTML = `
            <h3 id="quiz-question">"${correctEntry.word}" 的意思是什麼？</h3>
            <div id="quiz-options">
                ${options.map(opt => `<div class="quiz-option">${opt}</div>`).join('')}
            </div>
            <div id="quiz-feedback"></div>
            <button id="next-quiz-btn" class="btn-primary hidden">下一題</button>
        `;

        document.querySelectorAll('.quiz-option').forEach(option => option.addEventListener('click', handleQuizAnswer));
        document.getElementById('next-quiz-btn').addEventListener('click', generateQuizQuestion);
    }

    function handleQuizAnswer(e) {
        const selectedAnswer = e.target.textContent;
        const options = document.querySelectorAll('.quiz-option');
        const feedbackEl = document.getElementById('quiz-feedback');
        const nextBtn = document.getElementById('next-quiz-btn');

        options.forEach(option => {
            option.removeEventListener('click', handleQuizAnswer); // 防止重複點擊
            option.style.pointerEvents = 'none';

            if (option.textContent === currentQuizState.correctAnswer) {
                option.classList.add('correct');
            } else if (option.textContent === selectedAnswer) {
                option.classList.add('incorrect');
            }
        });

        if (selectedAnswer === currentQuizState.correctAnswer) {
            feedbackEl.textContent = "答對了！🎉";
            feedbackEl.style.color = '#155724';
        } else {
            feedbackEl.textContent = "答錯了！";
            feedbackEl.style.color = '#721c24';
        }
        nextBtn.classList.remove('hidden');
    }

    // --- 事件監聽器 ---

    let debounceTimer;
    textInput.addEventListener('input', () => {
        const text = textInput.value;
        charCounter.textContent = `${text.length} / 5000`;

        clearTimeout(debounceTimer);
        if (text) {
            debounceTimer = setTimeout(() => {
                handleTranslation();
            }, 800); // 使用者停止輸入 800 毫秒後觸發翻譯
        }
    });

    swapLangBtn.addEventListener('click', () => {
        const sourceVal = sourceLangSelect.value;
        const targetVal = targetLangSelect.value;
        if (sourceVal !== 'auto') {
            sourceLangSelect.value = targetVal;
            targetLangSelect.value = sourceVal;
            
            const inputText = textInput.value;
            const outputText = textOutput.textContent;
            
            // 只有在輸出區不是預設文字時才交換
            if (!textOutput.classList.contains('loading-placeholder')) {
                textInput.value = outputText;
                textOutput.textContent = inputText;
                handleTranslation();
            }
        }
    });

    addToNotebookBtn.addEventListener('click', saveToNotebook);

    openNotebookBtn.addEventListener('click', () => {
        renderNotebook();
        notebookModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => notebookModal.classList.add('hidden'));
    clearNotebookBtn.addEventListener('click', () => {
        if (confirm("你確定要清空所有筆記嗎？這個操作無法復原。")) {
            notebook = [];
            localStorage.removeItem('husonAI_notebook');
            renderNotebook();
        }
    });
    
    notebookList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-word-btn');
        if (deleteBtn) {
            const index = deleteBtn.dataset.index;
            notebook.splice(index, 1);
            localStorage.setItem('husonAI_notebook', JSON.stringify(notebook));
            renderNotebook();
        }
    });
    
    startQuizBtn.addEventListener('click', startQuiz);
    closeQuizBtn.addEventListener('click', () => {
       quizModal.classList.add('hidden');
       notebookModal.classList.remove('hidden'); // 返回筆記本視窗
    });

    // --- 初始化 ---
    populateLanguages();
});