// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('App Initializing...');

    // State
    const state = {
        currentView: 'landing', // landing, assessment, chat
        learningStyle: null,
        assessmentProgress: 0,
        chatHistory: [],
        knowledgeBase: [] // Will hold Excel data
    };

    // DOM Elements
    const views = {
        landing: document.getElementById('view-landing'),
        assessment: document.getElementById('view-assessment'),
        chat: document.getElementById('view-chat')
    };

    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const excelInput = document.getElementById('excel-upload');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // Verify critical elements
    if (!startBtn || !views.landing) {
        console.error('Critical elements missing!');
        return;
    }

    // Navigation
    function switchView(viewName) {
        console.log('Switching to view:', viewName);
        const target = views[viewName];

        // Hide others
        Object.values(views).forEach(el => {
            if (el && el !== target) {
                el.classList.remove('active');
                setTimeout(() => el.classList.add('hidden'), 300); // Wait for fade out
            }
        });

        // Show target
        if (target) {
            target.classList.remove('hidden');
            // Small delay to allow display:block to apply before opacity transition
            requestAnimationFrame(() => {
                setTimeout(() => target.classList.add('active'), 50);
            });
            state.currentView = viewName;
        }
    }

    // Assessment Logic (Mock)
    window.startAssessment = function () {
        console.log('Starting Assessment...');
        switchView('assessment');

        const card = document.getElementById('question-card');
        if (card) {
            card.innerHTML = `
                <h2 style="margin-bottom: 16px;">자신의 학습 성향을 선택해 주세요</h2>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="primary-btn" onclick="window.finishAssessment('원칙주의형')">원칙주의형 (체계적이고 꼼꼼함)</button>
                    <button class="primary-btn" onclick="window.finishAssessment('목표지향형')">목표지향형 (성취와 효율 중시)</button>
                    <button class="primary-btn" onclick="window.finishAssessment('한 우물형')">한 우물형 (깊이 있는 탐구)</button>
                    <button class="primary-btn" onclick="window.finishAssessment('전체주의형')">전체주의형 (큰 그림과 맥락 중시)</button>
                </div>
            `;
        }
    }

    // Expose finishAssessment to window so inline onclick works
    window.finishAssessment = (style) => {
        console.log('Selected style:', style);
        state.learningStyle = style;
        addBotMessage(`진단 완료! 당신은 **${style}**입니다. 맞춤형 학습 코칭을 시작합니다.`);
        switchView('chat');
    };

    // Chat Logic
    function handleSendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // Add User Message
        addMessage(text, 'user');
        userInput.value = '';

        // Simulate Bot Response (Check-Empathize-Solution)
        const responses = generateResponse(text);

        // If response is a string (default/error), just show it
        if (typeof responses === 'string') {
            setTimeout(() => addBotMessage(responses), 600);
        } else {
            // If response is an object with steps, show them sequentially
            // 1. Check
            setTimeout(() => {
                addBotMessage(`<strong>[점검]</strong> ${responses.check}`);

                // 2. Empathize (after 1.5s)
                setTimeout(() => {
                    addBotMessage(`<strong>[공감]</strong> ${responses.empathy}`);

                    // 3. Solution (after another 1.5s)
                    setTimeout(() => {
                        addBotMessage(`<strong>[해결]</strong> ${responses.solution}`);
                    }, 1500);

                }, 1500);

            }, 600);
        }
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.innerHTML = `<div class="message-content">${text}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addBotMessage(html) {
        const div = document.createElement('div');
        div.className = 'message bot';
        div.innerHTML = `<div class="message-content">${html}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function generateResponse(query) {
        // 1. Check if we have data
        if (state.knowledgeBase.length === 0) {
            return "기본 모드로 실행 중입니다. 구체적인 조언을 받으려면 엑셀 파일을 업로드해주세요! <br><br>일단은 핵심 개념 위주로 공부하는 것을 추천해요.";
        }

        // 2. Search for keyword match
        const lowerQuery = query.toLowerCase();

        // Filter all rows that match the keyword
        const candidates = state.knowledgeBase.filter(row => {
            if (!row.QuestionKeyword) return false;
            const dbKeyword = row.QuestionKeyword.toString().toLowerCase();

            // 1. User typed a sentence that contains the Excel keyword (e.g. Excel: "Math", User: "Help with Math")
            if (lowerQuery.includes(dbKeyword)) return true;

            // 2. User typed a keyword that appears in the Excel question (e.g. Excel: "How to use a Planner", User: "Planner")
            // This allows users to search for a word inside a long question in the Excel file
            if (dbKeyword.includes(lowerQuery) && lowerQuery.length > 1) return true; // Avoid single letter matches

            return false;
        });

        if (candidates.length > 0) {
            // 3. Find the best match among candidates
            // Priority 1: Exact match for the current Learning Style
            // Priority 2: Generic match (LearningStyle is empty or 'All')

            let match = candidates.find(row => row.LearningStyle === state.learningStyle);

            if (!match) {
                match = candidates.find(row => !row.LearningStyle || row.LearningStyle === 'All');
            }

            // If we found a match (either specific or generic)
            if (match) {
                const check = (match.CheckResponse || "질문하신 내용을 확인했습니다.").replace('{style}', state.learningStyle);
                const empathy = (match.EmpathyResponse || "그 부분은 많은 학생들이 어려워하는 부분이죠.").replace('{style}', state.learningStyle);
                const solution = (match.SolutionResponse || "이렇게 한번 해보세요.").replace('{style}', state.learningStyle);

                return { check, empathy, solution };
            }
        }

        // 4. No match found
        return {
            check: `"${query}"에 대해 물어보셨군요.`,
            empathy: "아쉽게도 제 데이터베이스에 해당 키워드에 대한 구체적인 조언이 아직 없네요.",
            solution: "엑셀 파일에 있는 과목이나 주제로 다시 질문해 주시겠어요?"
        };
    }

    // Excel Logic
    function processExcelData(arrayBuffer) {
        try {
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            // Normalize Column Names (Fuzzy Matching)
            const normalizedData = jsonData.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

                    if (cleanKey.includes('question') || cleanKey.includes('keyword')) newRow.QuestionKeyword = row[key];
                    else if (cleanKey.includes('learning') || cleanKey.includes('style')) newRow.LearningStyle = row[key];
                    else if (cleanKey.includes('check')) newRow.CheckResponse = row[key];
                    else if (cleanKey.includes('empathy')) newRow.EmpathyResponse = row[key];
                    else if (cleanKey.includes('solution')) newRow.SolutionResponse = row[key];
                    else newRow[key] = row[key];
                });
                return newRow;
            });

            const validData = normalizedData.filter(row => row.QuestionKeyword && row.QuestionKeyword.toString().trim() !== '');
            state.knowledgeBase = validData;

            console.log(`Loaded ${validData.length} rows from Excel.`);
            return validData.length;
        } catch (err) {
            console.error('Excel parsing error:', err);
            return 0;
        }
    }

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const count = processExcelData(e.target.result);
            if (count > 0) {
                alert(`데이터 로드 완료! (${count}개의 질문)`);
            } else {
                alert('데이터를 읽을 수 없습니다. 파일을 확인해주세요.');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function loadDefaultData() {
        try {
            const response = await fetch('data.xlsx');
            if (!response.ok) throw new Error('No default data file');
            const arrayBuffer = await response.arrayBuffer();
            const count = processExcelData(arrayBuffer);
            if (count > 0) {
                console.log('Auto-loaded default data successfully.');
            }
        } catch (err) {
            console.log('No default data.xlsx found. Waiting for manual upload.');
        }
    }

    function resetApp() {
        state.currentView = 'landing';
        state.learningStyle = null;
        state.chatHistory = [];
        chatMessages.innerHTML = `
            <div class="message bot">
                <div class="message-content">
                    안녕하세요! 학습 성향에 맞춰 공부를 도와드릴 준비가 되었습니다. 어떤 과목을 공부 중이신가요?
                </div>
            </div>
        `;
        switchView('landing');
    }

    // Event Listeners
    startBtn.addEventListener('click', startAssessment);
    resetBtn.addEventListener('click', resetApp);

    // Chat Listeners
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    // Excel Upload (Hidden but functional if needed)
    if (excelInput) excelInput.addEventListener('change', handleFileUpload);

    // Init
    loadDefaultData(); // Try to load data.xlsx on startup
    switchView('landing');

    console.log('App Initialized Successfully');
});
