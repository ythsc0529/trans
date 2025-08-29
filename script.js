document.addEventListener('DOMContentLoaded', () => {
    const sourceTextEl = document.getElementById('source-text');
    const outputTextEl = document.getElementById('output-text');
    const translateBtn = document.getElementById('translate-btn');
    const sourceLangEl = document.getElementById('source-lang');
    const targetLangEl = document.getElementById('target-lang');
    const learningModeSwitch = document.getElementById('learning-mode-switch');
    const learningResultsEl = document.getElementById('learning-results');
    const detailedAnalysisEl = document.getElementById('detailed-analysis');
    const placeholderTextEl = document.getElementById('placeholder-text');
    const loadingSpinnerEl = document.getElementById('loading-spinner');

    let typed; // Variable for the Typed.js instance

    translateBtn.addEventListener('click', handleTranslation);

    async function handleTranslation() {
        const sourceText = sourceTextEl.value.trim();
        if (!sourceText) {
            alert('請輸入要翻譯的內容！');
            return;
        }

        // Show loading state
        showLoading(true);

        const sourceLang = sourceLangEl.value;
        const targetLang = targetLangEl.value;
        const isLearningMode = learningModeSwitch.checked;

        // Determine mode based on input and learning mode toggle
        let mode = 'translate';
        const wordCount = sourceText.split(/\s+/).length;
        if (wordCount <= 5) {
             mode = 'word_lookup';
        }
        if (isLearningMode && wordCount > 5) {
            mode = 'learning';
        }

        try {
            const response = await fetch('/.netlify/functions/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: sourceText,
                    sourceLang,
                    targetLang,
                    mode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '翻譯時發生錯誤');
            }

            const data = await response.json();
            
            showLoading(false);
            displayResults(data, mode);

        } catch (error) {
            console.error('Translation error:', error);
            showLoading(false);
            outputTextEl.textContent = `錯誤: ${error.message}`;
        }
    }

    function showLoading(isLoading) {
        if (isLoading) {
            placeholderTextEl.classList.add('hidden');
            outputTextEl.textContent = '';
            learningResultsEl.classList.add('hidden');
            detailedAnalysisEl.innerHTML = '';
            loadingSpinnerEl.classList.remove('hidden');
            
            // Start typing animation
            if (typed) typed.destroy();
            typed = new Typed('#output-text', {
                strings: ['husonAI 正在思考...', '分析語意結構...', '生成最精準的翻譯...'],
                typeSpeed: 50,
                backSpeed: 20,
                loop: true,
                showCursor: true,
            });
        } else {
            loadingSpinnerEl.classList.add('hidden');
            if (typed) typed.destroy();
        }
    }

    function displayResults(data, mode) {
        outputTextEl.textContent = data.translation;

        if (mode === 'learning' || mode === 'word_lookup') {
            detailedAnalysisEl.innerHTML = formatAIResponse(data.analysis);
            learningResultsEl.classList.remove('hidden');
        } else {
            learningResultsEl.classList.add('hidden');
        }
    }
    
    // This function helps format the AI's markdown-like response into proper HTML
    function formatAIResponse(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italics
            .replace(/`(.*?)`/g, '<code>$1</code>')       // Code
            .replace(/### (.*?)\n/g, '<h3>$1</h3>')   // H3
            .replace(/## (.*?)\n/g, '<h2>$1</h2>')     // H2
            .replace(/(\d+\.)/g, '<br><strong>$1</strong>'); // Numbered lists
    }
});