let allQuestions = [];
let currentQuestions = [];
let currentScore = 0;
const QUESTIONS_PER_QUIZ = 5;

// 等待頁面完全載入
window.onload = function() {
    console.log('頁面載入完成');
    initializeQuiz();
};

function initializeQuiz() {
    // 獲取元素
    const fileUpload = document.getElementById('fileUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const startBtn = document.getElementById('startBtn');
    
    console.log('初始化元素：', {
        fileUpload: !!fileUpload,
        uploadBtn: !!uploadBtn,
        startBtn: !!startBtn
    });

    // 檢查元素是否存在
    if (!fileUpload || !uploadBtn || !startBtn) {
        console.error('找不到必要的HTML元素');
        return;
    }

    // 上傳按鈕點擊事件
    uploadBtn.onclick = function() {
        console.log('點擊上傳按鈕');
        fileUpload.click();
    };

    // 檔案選擇事件
    fileUpload.onchange = function(e) {
        console.log('選擇檔案');
        const file = e.target.files[0];
        if (file) {
            console.log('選擇的檔案：', file.name);
            document.getElementById('fileName').textContent = `處理中... ${file.name}`;
            readExcel(file);
        }
    };

    // 開始測驗按鈕事件
    startBtn.onclick = startQuiz;
}

function readExcel(file) {
    console.log('開始讀取Excel檔案');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            console.log('檔案讀取完成，開始解析');
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            if (!workbook.SheetNames.length) {
                throw new Error('Excel檔案沒有工作表');
            }

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 轉換成JSON
            allQuestions = XLSX.utils.sheet_to_json(worksheet);
            console.log('讀取到的題目：', allQuestions);

            // 驗證題目格式
            const isValid = validateQuestions(allQuestions);
            if (!isValid) {
                throw new Error('題目格式不正確');
            }

            // 更新UI
            if (allQuestions.length >= 5) {
                document.getElementById('fileName').textContent = 
                    `✅ 已成功載入 ${allQuestions.length} 題`;
                document.getElementById('startBtn').disabled = false;
                alert(`✨ 成功載入 ${allQuestions.length} 題！可以開始測驗了！`);
            } else {
                throw new Error('題目數量不足5題');
            }
        } catch (error) {
            console.error('處理檔案時發生錯誤：', error);
            document.getElementById('fileName').textContent = '❌ 讀取失敗';
            document.getElementById('startBtn').disabled = true;
            alert('❌ 讀取檔案時發生錯誤：\n' + error.message);
        }
    };

    reader.onerror = function(error) {
        console.error('讀取檔案失敗：', error);
        document.getElementById('fileName').textContent = '❌ 檔案讀取失敗';
        document.getElementById('startBtn').disabled = true;
        alert('❌ 檔案讀取失敗，請確認檔案格式是否正確');
    };

    // 開始讀取檔案
    reader.readAsArrayBuffer(file);
}

// 驗證題目格式
function validateQuestions(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
        return false;
    }

    // 檢查每個題目的必要欄位
    return questions.every(q => {
        return (
            q.type && 
            q.question && 
            q.A && 
            q.B && 
            q.C && 
            q.D && 
            q.answer
        );
    });
}

function startQuiz() {
    displayQuestions();
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('uploadBtn').style.display = 'none';
    document.getElementById('fileName').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('submitBtn').style.display = 'block';
}

// displayQuestions, submitQuiz, 和 restartQuiz 函數保持不變
function displayQuestions() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = '';

    if (!currentQuestions || currentQuestions.length === 0) {
        container.innerHTML = '<p>沒有可顯示的題目</p>';
        return;
    }

    currentQuestions.forEach((q, index) => {
        if (!q.type || !q.question) {
            console.error('題目格式錯誤：', q);
            return;
        }

        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';

        try {
            if (q.type === 'multiple') {
                questionDiv.innerHTML = `
                    <p>${index + 1}. ${q.question}</p>
                    <div class="options">
                        <input type="radio" name="q${index}" value="A"> ${q.A}<br>
                        <input type="radio" name="q${index}" value="B"> ${q.B}<br>
                        <input type="radio" name="q${index}" value="C"> ${q.C}<br>
                        <input type="radio" name="q${index}" value="D"> ${q.D}
                    </div>
                `;
            } else if (q.type === 'fill') {
                questionDiv.innerHTML = `
                    <p>${index + 1}. ${q.question}</p>
                    <input type="text" name="q${index}">
                `;
            } else if (q.type === 'matching') {
                const options = q.options ? q.options.split(',') : [];
                questionDiv.innerHTML = `
                    <p>${index + 1}. ${q.question}</p>
                    <select name="q${index}">
                        <option value="">請選擇</option>
                        ${options.map(opt => 
                            `<option value="${opt.split('.')[0]}">${opt}</option>`
                        ).join('')}
                    </select>
                `;
            }

            container.appendChild(questionDiv);
        } catch (error) {
            console.error(`處理題目 ${index + 1} 時發生錯誤：`, error);
        }
    });
}

function submitQuiz() {
    currentScore = 0;
    currentQuestions.forEach((q, index) => {
        let userAnswer;
        if (q.type === 'multiple') {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            userAnswer = selected ? selected.value : '';
        } else if (q.type === 'fill') {
            userAnswer = document.querySelector(`input[name="q${index}"]`).value;
        } else if (q.type === 'matching') {
            userAnswer = document.querySelector(`select[name="q${index}"]`).value;
        }

        if (userAnswer.toLowerCase() === q.answer.toLowerCase()) {
            currentScore++;
        }
    });

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `得分：${currentScore} / ${currentQuestions.length}`;
    resultDiv.style.display = 'block';
    
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'block';
    document.getElementById('quizContainer').style.pointerEvents = 'none';
}

function restartQuiz() {
    document.getElementById('quizContainer').style.pointerEvents = 'auto';
    document.getElementById('result').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('uploadBtn').style.display = 'block';
    document.getElementById('fileName').style.display = 'block';
    document.getElementById('fileName').textContent = '';
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('startBtn').disabled = true;
    document.getElementById('quizContainer').style.display = 'none';
    currentQuestions = [];
} 