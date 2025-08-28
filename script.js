document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('input-text');
    const translationResultDiv = document.getElementById('translation-result');
    const learningOutputDiv = document.getElementById('learning-output');
    const learningContentDiv = document.getElementById('learning-content');
    const translateBtn = document.getElementById('translate-btn');
    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const swapLangBtn = document.getElementById('swap-lang-btn');
    const learningModeToggle = document.getElementById('learning-mode-toggle');
    const loader = document.getElementById('loader');

    // 翻譯功能
    const handleTranslation = async () => {
        const text = inputText.value.trim();
        if (!text) {
            alert('請輸入要翻譯的內容！');
            return;
        }

        // 顯示載入動畫，清空舊內容
        loader.classList.remove('hidden');
        translationResultDiv.innerHTML = '';
        learningOutputDiv.classList.add('hidden');
        learningContentDiv.innerHTML = '';

        try {
            const response = await fetch('/.netlify/functions/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    sourceLang: sourceLangSelect.value,
                    targetLang: targetLangSelect.value,
                    mode: learningModeToggle.checked ? 'learning' : 'translateOnly',
                }),
            });

            if (!response.ok) {
                throw new Error('翻譯請求失敗');
            }
            
            const data = await response.json();
            let resultData = data.result;

            // 檢查是否為 JSON 格式 (學習模式)
            try {
                const learningData = JSON.parse(resultData);
                if (learningData.translation && learningData.learning_notes) {
                    displayLearningResults(learningData);
                } else {
                    displaySimpleText(resultData);
                }
            } catch (e) {
                // 如果不是 JSON，則視為一般文字或 Markdown (單字查詢)
                displaySimpleText(resultData);
            }

        } catch (error) {
            console.error('翻譯時發生錯誤:', error);
            translationResultDiv.textContent = '抱歉，翻譯時發生錯誤，請稍後再試。';
        } finally {
            // 隱藏載入動畫
            loader.classList.add('hidden');
        }
    };
    
    // 顯示純文字或 Markdown 結果
    const displaySimpleText = (text) => {
        // 簡單的 Markdown 轉換 (粗體和換行)
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        translationResultDiv.innerHTML = html;
    };

    // 顯示學習模式結果
    const displayLearningResults = (data) => {
        translationResultDiv.textContent = data.translation;
        
        let learningHtml = '<h4>文法重點</h4><ul>';
        data.learning_notes.grammar.forEach(item => {
            learningHtml += `<li><strong>${item.point}:</strong> ${item.explanation}</li>`;
        });
        learningHtml += '</ul><h4>核心單字</h4><ul>';
        data.learning_notes.vocabulary.forEach(item => {
            learningHtml += `<li><strong>${item.word}</strong> (${item.pos}): ${item.meaning}</li>`;
        });
        learningHtml += '</ul>';

        learningContentDiv.innerHTML = learningHtml;
        learningOutputDiv.classList.remove('hidden');
    };

    // 事件監聽
    translateBtn.addEventListener('click', handleTranslation);

    // 交換語言
    swapLangBtn.addEventListener('click', () => {
        if (sourceLangSelect.value === 'auto') return; // 自動偵測不能交換
        const temp = sourceLangSelect.value;
        sourceLangSelect.value = targetLangSelect.value;
        targetLangSelect.value = temp;
    });
});