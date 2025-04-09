// ページ切り替えや他のJavaScriptロジックを後で記述
document.addEventListener('DOMContentLoaded', () => {
    // --- IndexedDB 設定 ---
    const DB_NAME = 'calendarAppDB';
    const DB_VERSION = 3; // 収入ストア追加のためバージョンアップ
    const TASK_STORE_NAME = 'tasks';
    const EXPENSE_STORE_NAME = 'expenses';
    const DAY_COLOR_STORE_NAME = 'dayColors'; // 色付けストア名
    const INCOME_STORE_NAME = 'income'; // 収入ストア名
    let db;

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.errorCode);
                reject('IndexedDB error');
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('IndexedDB opened successfully.');
                resolve(db);
            };

            // DBバージョンが古い場合や、DBが存在しない場合に実行
            request.onupgradeneeded = (event) => {
                console.log('IndexedDB upgrade needed.');
                db = event.target.result;
                // タスク用オブジェクトストア
                if (!db.objectStoreNames.contains(TASK_STORE_NAME)) {
                    const taskStore = db.createObjectStore(TASK_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    taskStore.createIndex('date', 'start', { unique: false }); // 日付で検索するため
                    console.log(`Object store '${TASK_STORE_NAME}' created.`);
                }
                // 費用用オブジェクトストア (後で詳細定義)
                if (!db.objectStoreNames.contains(EXPENSE_STORE_NAME)) {
                    const expenseStore = db.createObjectStore(EXPENSE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    expenseStore.createIndex('date', 'date', { unique: false });
                    expenseStore.createIndex('category', 'category', { unique: false });
                    console.log(`Object store '${EXPENSE_STORE_NAME}' created.`);
                }
                // 日付の色付け用オブジェクトストア (キーは YYYY-MM-DD 形式の日付)
                if (!db.objectStoreNames.contains(DAY_COLOR_STORE_NAME)) {
                    const dayColorStore = db.createObjectStore(DAY_COLOR_STORE_NAME, { keyPath: 'date' });
                    console.log(`Object store '${DAY_COLOR_STORE_NAME}' created.`);
                }
                // 収入用オブジェクトストア
                if (!db.objectStoreNames.contains(INCOME_STORE_NAME)) {
                    const incomeStore = db.createObjectStore(INCOME_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    incomeStore.createIndex('date', 'date', { unique: false });
                    console.log(`Object store '${INCOME_STORE_NAME}' created.`);
                }
            };
        });
    }

    // アプリケーション開始時にDBを開く
    openDB().then(() => {
        // DBが開かれた後にカレンダーのイベントを読み込むなどの処理を行う
        if (calendarInstance) { // カレンダーが初期化済みならイベントを再読み込み
            calendarInstance.refetchEvents();
        }
        // DBが開かれたら、初期の費用履歴を表示
        displayExpenses();
        displaySummary(); // 初期サマリー表示
        checkConsumables(); // 初期チェック
    }).catch(error => {
        console.error('Failed to open IndexedDB:', error);
        alert('データベースの初期化に失敗しました。アプリが正常に動作しない可能性があります。');
    });
    let calendarInstance; // カレンダーインスタンスをグローバルにアクセス可能にする


    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    function showPage(pageId) {
        pages.forEach(page => {
            // 指定されたIDのページかどうかで active クラスを切り替え
            page.classList.toggle('active', page.id === pageId);
        });
        navLinks.forEach(link => {
            // 対応するナビゲーションリンクの active クラスを切り替え
            link.classList.toggle('active', link.dataset.page === pageId);
        });
        console.log(`Navigated to: ${pageId}`); // デバッグ用ログ
        // サマリーページが表示されたら内容を更新
        if (pageId === 'summary-page') {
            displaySummary();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // デフォルトのアンカー動作（ページ遷移）をキャンセル
            const pageId = link.dataset.page;
            if (pageId) { // pageId が取得できた場合のみ実行
                showPage(pageId);
                // URLのハッシュも更新（オプション、ブラウザ履歴やブックマークに影響）
                // window.location.hash = link.getAttribute('href');
            } else {
                console.error('data-page attribute is missing or empty for link:', link);
            }
        });
    });

    // --- 初期ページの表示処理 ---
    let initialPageId = 'calendar-page'; // デフォルトはカレンダーページ
    // 1. URLハッシュを確認
    if (window.location.hash) {
        const hashPageId = window.location.hash.substring(1); // '#' を除去
        // 2. ハッシュに対応するページが存在するか確認
        if (document.getElementById(hashPageId)) {
            initialPageId = hashPageId;
        } else {
            console.warn(`Page with ID "${hashPageId}" from URL hash not found. Falling back to default.`);
        }
    }

    // 3. 初期ページを表示
    showPage(initialPageId);

    // --- 他の初期化コードをここに追加 ---
    // --- FullCalendarの初期化 ---
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) { // カレンダー要素が存在する場合のみ初期化
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth', // 初期表示を月ビューに
            locale: 'ja', // 日本語化
            headerToolbar: { // ヘッダーのボタン設定
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay' // 月/週/日ビュー切り替え
            },
            editable: true, // イベントのドラッグ＆ドロップを有効化
            // --- ここにイベントデータや他の設定を追加していく ---
            // 例: イベントデータ (後でIndexedDBから読み込むように変更)
            events: function(fetchInfo, successCallback, failureCallback) {
                if (!db) {
                    console.error("DB is not open yet.");
                    failureCallback("Database not ready");
                    return;
                }
                // Promise.allを使って、タスク、祝日、日付の色を非同期に取得
                Promise.all([
                    // 1. タスクを取得
                    new Promise((resolve, reject) => {
                        const taskTransaction = db.transaction(TASK_STORE_NAME, 'readonly');
                        const taskStore = taskTransaction.objectStore(TASK_STORE_NAME);
                        const taskRequest = taskStore.getAll();
                        taskRequest.onsuccess = () => resolve(taskRequest.result);
                        taskRequest.onerror = (event) => reject(`Failed to fetch tasks: ${event.target.error}`);
                    }),
                    // 2. 日付の色を取得
                    new Promise((resolve, reject) => {
                        const colorTransaction = db.transaction(DAY_COLOR_STORE_NAME, 'readonly');
                        const colorStore = colorTransaction.objectStore(DAY_COLOR_STORE_NAME);
                        const colorRequest = colorStore.getAll();
                        colorRequest.onsuccess = () => resolve(colorRequest.result);
                        colorRequest.onerror = (event) => reject(`Failed to fetch day colors: ${event.target.error}`);
                    })
                ]).then(([tasks, dayColors]) => {
                    // 3. 祝日データ (固定)
                    const holidays = [
                        { title: '元日', start: '2025-01-01', allDay: true, className: 'holiday', display: 'background' },
                        { title: '成人の日', start: '2025-01-13', allDay: true, className: 'holiday', display: 'background' },
                        { title: '建国記念の日', start: '2025-02-11', allDay: true, className: 'holiday', display: 'background' },
                        { title: '天皇誕生日', start: '2025-02-23', allDay: true, className: 'holiday', display: 'background' },
                        { title: '振替休日', start: '2025-02-24', allDay: true, className: 'holiday', display: 'background' },
                        { title: '春分の日', start: '2025-03-20', allDay: true, className: 'holiday', display: 'background' },
                        { title: '昭和の日', start: '2025-04-29', allDay: true, className: 'holiday', display: 'background' },
                        { title: '憲法記念日', start: '2025-05-03', allDay: true, className: 'holiday', display: 'background' },
                        { title: 'みどりの日', start: '2025-05-04', allDay: true, className: 'holiday', display: 'background' },
                        { title: 'こどもの日', start: '2025-05-05', allDay: true, className: 'holiday', display: 'background' },
                        { title: '振替休日', start: '2025-05-06', allDay: true, className: 'holiday', display: 'background' },
                        { title: '海の日', start: '2025-07-21', allDay: true, className: 'holiday', display: 'background' },
                        { title: '山の日', start: '2025-08-11', allDay: true, className: 'holiday', display: 'background' },
                        { title: '敬老の日', start: '2025-09-15', allDay: true, className: 'holiday', display: 'background' },
                        { title: '秋分の日', start: '2025-09-23', allDay: true, className: 'holiday', display: 'background' },
                        { title: 'スポーツの日', start: '2025-10-13', allDay: true, className: 'holiday', display: 'background' },
                        { title: '文化の日', start: '2025-11-03', allDay: true, className: 'holiday', display: 'background' },
                        { title: '振替休日', start: '2025-11-04', allDay: true, className: 'holiday', display: 'background' },
                        { title: '勤労感謝の日', start: '2025-11-23', allDay: true, className: 'holiday', display: 'background' },
                        { title: '振替休日', start: '2025-11-24', allDay: true, className: 'holiday', display: 'background' },
                    ];

                    // 4. 日付の色情報を背景イベントに変換
                    const colorEvents = dayColors.map(dc => ({
                        start: dc.date,
                        end: dc.date, // 終日背景色なので start と end を同じに
                        display: 'background',
                        color: dc.color,
                        id: `color-${dc.date}` // 識別用ID (任意)
                    }));

                    // 5. すべてのイベントを結合
                    const allEvents = [...tasks, ...holidays, ...colorEvents];
                    successCallback(allEvents);

                }).catch(error => {
                    console.error('Failed to fetch events:', error);
                    failureCallback(error);
                });
            },
            // --- 日付クリック時の処理 ---
            dateClick: function(info) {
                if (info.dayEl.classList.contains('fc-day-other')) return;

                const actionChoice = prompt(`日付 ${info.dateStr} の操作を選択:\n1: タスク追加\n2: 色付け/解除`, '1');

                if (actionChoice === '1') {
                    // タスク追加
                    const taskTitle = prompt(`タスクを追加 (${info.dateStr}):`, '');
                    if (taskTitle && taskTitle.trim() !== '') {
                        const newTask = {
                            title: taskTitle.trim(),
                            start: info.dateStr,
                            allDay: true
                        };
                        addTask(newTask);
                    }
                } else if (actionChoice === '2') {
                    // 色付け/解除
                    const colorChoices = {
                        '1': '#ffcdd2', // ピンク系
                        '2': '#bbdefb', // 水色系
                        '3': '#fff9c4', // 黄色系
                        '4': '#c8e6c9', // 緑系
                        '0': null      // 色を消す
                    };
                    const colorChoice = prompt(`色を選択:\n1: ピンク\n2: 水色\n3: 黄色\n4: 緑\n0: 色を消す`, '1');

                    if (colorChoice !== null && colorChoices.hasOwnProperty(colorChoice)) {
                        const selectedColor = colorChoices[colorChoice];
                        setDayColor(info.dateStr, selectedColor);
                    }
                }
            },
            // --- イベントクリック時の処理 (編集/削除) ---
            eventClick: function(info) {
                // 背景イベント（祝日など）は無視
                if (info.event.display === 'background') {
                    return;
                }

                const eventId = parseInt(info.event.id); // IndexedDBのIDは数値
                const currentTitle = info.event.title;

                // アクションを選択させる (confirmとpromptを使用)
                const action = prompt(`タスク "${currentTitle}"\n編集後のタイトルを入力 (空欄で削除確認):`, currentTitle);

                if (action === null) {
                    // キャンセルされた場合
                    console.log('Edit/Delete cancelled.');
                } else if (action.trim() === '') {
                    // 削除の場合
                    if (confirm(`タスク "${currentTitle}" を削除しますか？`)) {
                        deleteTask(eventId);
                    }
                } else if (action.trim() !== currentTitle) {
                    // 編集の場合
                    const updatedTask = {
                        id: eventId,
                        title: action.trim(),
                        start: info.event.startStr, // 日付は変更しない
                        allDay: info.event.allDay
                    };
                    updateTask(updatedTask);
                }
            },
            // --- イベントドラッグ＆ドロップ時の処理 (日付変更) ---
            eventDrop: function(info) {
                 // 背景イベント（祝日など）は無視
                if (info.event.display === 'background') {
                    info.revert(); // ドロップを元に戻す
                    return;
                }

                const eventId = parseInt(info.event.id);
                const updatedTask = {
                    id: eventId,
                    title: info.event.title,
                    start: info.event.startStr, // 新しい日付
                    allDay: info.event.allDay
                    // 必要であれば終了日(end)も更新
                };
                console.log(`Task dropped: ID=${eventId}, New Date=${updatedTask.start}`);
                updateTask(updatedTask); // DBを更新
            }
        });
        calendarInstance = calendar; // インスタンスを保存
        calendarInstance.render(); // カレンダーを描画
        console.log('FullCalendar Initialized.');
    } else {
        console.error('Calendar element (#calendar) not found.');
    }


    console.log('Calendar Household App Initialized.');

    // --- 費用入力フォームの要素取得 ---
    const expenseEntryForm = document.getElementById('expense-entry-form'); // ID変更
    const expenseIdInput = document.getElementById('expense-id');
    const expenseDateInput = document.getElementById('expense-date');
    const expenseCategoryInput = document.getElementById('expense-category');
    const expenseItemInput = document.getElementById('expense-item');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseStoreInput = document.getElementById('expense-store');
    const expenseTableBody = document.querySelector('#expense-table tbody');
    const addExpenseButton = document.getElementById('add-expense-button');
    const updateExpenseButton = document.getElementById('update-expense-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const expenseFormTitle = document.getElementById('expense-form-title');
    // サマリー表示用要素
    const incomeSummaryDiv = document.getElementById('income-summary');
    const fixedCostSummaryDiv = document.getElementById('fixed-cost-summary');
    const variableCostSummaryDiv = document.getElementById('variable-cost-summary');
    const budgetSettingDiv = document.getElementById('budget-setting'); // 予算設定UI用
    const notificationArea = document.getElementById('notification-area');
    // 収入入力フォーム要素 (後でHTMLに追加)
    const incomeForm = document.getElementById('add-income-form');
    const incomeDateInput = document.getElementById('income-date');
    const incomeAmountInput = document.getElementById('income-amount');
    const incomeDescriptionInput = document.getElementById('income-description');

    if (expenseEntryForm) {
        resetExpenseForm(); // 初期状態に設定

        expenseEntryForm.addEventListener('submit', (event) => {
            event.preventDefault(); // デフォルトのフォーム送信をキャンセル

            const expenseData = {
                date: expenseDateInput.value,
                category: expenseCategoryInput.value,
                item: expenseItemInput.value.trim(),
                amount: parseInt(expenseAmountInput.value), // 数値に変換
                store: expenseStoreInput.value.trim()
            };

            // 簡単なバリデーション
            if (!expenseData.date || !expenseData.category || isNaN(expenseData.amount) || expenseData.amount <= 0) {
                alert('日付、カテゴリ、金額は必須です。金額は0より大きい値を入力してください。');
                return;
            }

            const editingId = parseInt(expenseIdInput.value);
            if (editingId) {
                // 更新処理
                expenseData.id = editingId; // IDを追加
                updateExpense(expenseData);
            } else {
                // 追加処理
                addExpense(expenseData);
            }
        });

        // キャンセルボタンの処理
        cancelEditButton.addEventListener('click', () => {
            resetExpenseForm();
        });

    } else {
        console.error('Expense entry form not found.');
    }

    // --- 収入入力フォームの処理 ---
    if (incomeForm) {
        incomeDateInput.valueAsDate = new Date(); // デフォルト日付
        incomeForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const incomeData = {
                date: incomeDateInput.value,
                amount: parseInt(incomeAmountInput.value),
                description: incomeDescriptionInput.value.trim()
            };
            if (!incomeData.date || isNaN(incomeData.amount) || incomeData.amount <= 0) {
                alert('日付と金額（正の数）は必須です。');
                return;
            }
            addIncome(incomeData);
            incomeForm.reset();
            incomeDateInput.valueAsDate = new Date();
        });
    } else {
        // console.warn('Income form not found. Add HTML elements if needed.');
    }

    // --- 予算設定UIの初期化 ---
    setupBudgetUI();

    // --- 印刷ボタンのイベントリスナー ---
    const printButton = document.getElementById('print-button');
    if (printButton) {
        printButton.addEventListener('click', () => {
            window.print(); // 印刷ダイアログを開く
        });
    }
});

    // --- IndexedDB 操作関数 ---
    function addTask(taskData) {
        if (!db) {
            console.error("DB is not open.");
            alert("データベース接続エラーが発生しました。");
            return;
        }
        const transaction = db.transaction(TASK_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(TASK_STORE_NAME);
        const request = store.add(taskData);

        request.onsuccess = () => {
            console.log('Task added successfully:', taskData);
            if (calendarInstance) {
                calendarInstance.refetchEvents(); // カレンダー表示を更新
            }
        };

        request.onerror = (event) => {
            console.error('Failed to add task:', event.target.error);
            alert("タスクの追加に失敗しました。");
        };
    }

    function updateTask(taskData) {
        if (!db) {
            console.error("DB is not open.");
            alert("データベース接続エラーが発生しました。");
            return;
        }
        const transaction = db.transaction(TASK_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(TASK_STORE_NAME);
        // getで既存データを取得してからputするか、直接putするか
        // FullCalendarのイベントオブジェクトにはidが含まれている前提
        const request = store.put(taskData); // keyPathがあるので、IDが一致すれば更新

        request.onsuccess = () => {
            console.log('Task updated successfully:', taskData);
            // カレンダーの再描画はeventDrop/eventClick後に行われることが多いが、念のため呼ぶ場合もある
            // if (calendarInstance) calendarInstance.refetchEvents();
        };

        request.onerror = (event) => {
            console.error('Failed to update task:', event.target.error);
            alert("タスクの更新に失敗しました。");
        };
    }

    // --- 収入データの IndexedDB 操作関数 ---
    function addIncome(incomeData) {
        if (!db) return alertDbError();
        const transaction = db.transaction(INCOME_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(INCOME_STORE_NAME);
        const request = store.add(incomeData);

        request.onsuccess = () => {
            console.log('Income added successfully:', incomeData);
            displaySummary(); // サマリーを更新
        };
        request.onerror = (event) => {
            console.error('Failed to add income:', event.target.error);
            alert("収入の追加に失敗しました。");
        };
    }
    // TODO: updateIncome, deleteIncome (必要であれば)

    // --- 予算データの localStorage 操作関数 ---
    const BUDGET_STORAGE_KEY_PREFIX = 'budget_';

    function saveBudget(yearMonth, budgetData) {
        try {
            localStorage.setItem(BUDGET_STORAGE_KEY_PREFIX + yearMonth, JSON.stringify(budgetData));
            console.log(`Budget saved for ${yearMonth}:`, budgetData);
            return true;
        } catch (e) {
            console.error('Failed to save budget to localStorage:', e);
            alert('予算の保存に失敗しました。');
            return false;
        }
    }

    function loadBudget(yearMonth) {
        try {
            const budgetJson = localStorage.getItem(BUDGET_STORAGE_KEY_PREFIX + yearMonth);
            return budgetJson ? JSON.parse(budgetJson) : getDefaultBudget(); // 保存がなければデフォルトを返す
        } catch (e) {
            console.error('Failed to load budget from localStorage:', e);
            return getDefaultBudget(); // エラー時もデフォルト
        }
    }

    function getDefaultBudget() {
        // デフォルトの予算構造
        return { food: 0, daily: 0, medical: 0, other: 0 };
    }

    // --- 予算設定UIのセットアップ ---
    function setupBudgetUI() {
        if (!budgetSettingDiv) return;

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const budget = loadBudget(currentMonth);

        budgetSettingDiv.innerHTML = `
            <h4>予算設定 (${currentMonth})</h4>
            <form id="budget-form">
                <label for="budget-food">食費:</label>
                <input type="number" id="budget-food" value="${budget.food}" min="0" required>
                <label for="budget-daily">日用品:</label>
                <input type="number" id="budget-daily" value="${budget.daily}" min="0" required>
                <label for="budget-medical">病院代:</label>
                <input type="number" id="budget-medical" value="${budget.medical}" min="0" required>
                <label for="budget-other">その他雑費:</label>
                <input type="number" id="budget-other" value="${budget.other}" min="0" required>
                <button type="submit">予算を保存</button>
            </form>
        `;

        const budgetForm = document.getElementById('budget-form');
        budgetForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const newBudget = {
                food: parseInt(document.getElementById('budget-food').value) || 0,
                daily: parseInt(document.getElementById('budget-daily').value) || 0,
                medical: parseInt(document.getElementById('budget-medical').value) || 0,
                other: parseInt(document.getElementById('budget-other').value) || 0,
            };
            if (saveBudget(currentMonth, newBudget)) {
                alert('予算を保存しました。');
                displaySummary(); // 保存後にサマリーを再表示
            }
        });
    }

    function deleteTask(taskId) {
        if (!db) {
            console.error("DB is not open.");
            alert("データベース接続エラーが発生しました。");
            return;
        }
        const transaction = db.transaction(TASK_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(TASK_STORE_NAME);
        const request = store.delete(taskId);

        request.onsuccess = () => {
            console.log('Task deleted successfully:', taskId);
            if (calendarInstance) {
                calendarInstance.refetchEvents(); // カレンダー表示を更新
            }
        };

        request.onerror = (event) => {
            console.error('Failed to delete task:', event.target.error);
            alert("タスクの削除に失敗しました。");
        };
    }

    // --- 日付の色付け用 IndexedDB 操作関数 ---
    function setDayColor(date, color) {
        if (!db) {
            console.error("DB is not open.");
            alert("データベース接続エラーが発生しました。");
            return;
        }
        const transaction = db.transaction(DAY_COLOR_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(DAY_COLOR_STORE_NAME);

        if (color === null) {
            // 色を削除
            const request = store.delete(date);
            request.onsuccess = () => {
                console.log(`Color removed for date: ${date}`);
                if (calendarInstance) calendarInstance.refetchEvents();
            };
            request.onerror = (event) => {
                console.error(`Failed to remove color for date ${date}:`, event.target.error);
                alert("色の削除に失敗しました。");
            };
        } else {
            // 色を追加または更新
            const request = store.put({ date: date, color: color });
            request.onsuccess = () => {
                console.log(`Color set for date ${date}: ${color}`);
                if (calendarInstance) calendarInstance.refetchEvents();
            };
            request.onerror = (event) => {
                console.error(`Failed to set color for date ${date}:`, event.target.error);
                alert("色の設定に失敗しました。");
            };
        }
    }

    // --- 費用データの IndexedDB 操作関数 ---
    function addExpense(expenseData) {
        if (!db) {
            console.error("DB is not open.");
            alert("データベース接続エラーが発生しました。");
            return;
        }
        const transaction = db.transaction(EXPENSE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(EXPENSE_STORE_NAME);
        const request = store.add(expenseData);

        request.onsuccess = () => {
            console.log('Expense added successfully:', expenseData);
            displayExpenses(); // 履歴テーブルを更新
            displaySummary(); // サマリーページを更新
            checkConsumables(); // 購入チェック
        };

        request.onerror = (event) => {
            console.error('Failed to add expense:', event.target.error);
            alert("費用の追加に失敗しました。");
        };
    }

    function displayExpenses() {
        if (!db || !expenseTableBody) {
            // DBが開いていないか、テーブル要素が見つからない場合は何もしない
            // (ページがアクティブでない場合など)
            return;
        }
        // テーブルの内容をクリア
        expenseTableBody.innerHTML = '';

        const transaction = db.transaction(EXPENSE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(EXPENSE_STORE_NAME);
        // 日付で降順にソートして取得 (新しいものが上に来るように)
        const index = store.index('date');
        const request = index.openCursor(null, 'prev'); // 'prev'で降順

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const expense = cursor.value;
                const row = expenseTableBody.insertRow();

                row.innerHTML = `
                    <td>${expense.date}</td>
                    <td>${expense.category}</td>
                    <td>${expense.item || '-'}</td>
                    <td>${expense.amount.toLocaleString()} 円</td>
                    <td>${expense.store || '-'}</td>
                    <td class="action-buttons">
                        <button class="edit-button" data-id="${expense.id}">編集</button>
                        <button class="delete-button" data-id="${expense.id}">削除</button>
                    </td>
                `;
                // 削除ボタンのイベントリスナー
                const deleteButton = row.querySelector('.delete-button');
                deleteButton.addEventListener('click', () => {
                    if (confirm(`費用「${expense.item || expense.category} (${expense.amount}円)」を削除しますか？`)) {
                        deleteExpense(expense.id);
                    }
                });
                // 編集ボタンのイベントリスナー
                const editButton = row.querySelector('.edit-button');
                editButton.addEventListener('click', () => {
                    loadExpenseForEdit(expense.id);
                });

                cursor.continue(); // 次のレコードへ
            } else {
                console.log('No more expenses to display.');
                if (expenseTableBody.rows.length === 0) {
                     const row = expenseTableBody.insertRow();
                     const cell = row.insertCell();
                     cell.colSpan = 6; // 全カラムにまたがるセル
                     cell.textContent = '履歴はありません。';
                     cell.style.textAlign = 'center';
                }
            }
        };

        request.onerror = (event) => {
            console.error('Failed to fetch expenses:', event.target.error);
            const row = expenseTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.textContent = '履歴の読み込みに失敗しました。';
            cell.style.color = 'red';
        };
    }

    function updateExpense(expenseData) {
        if (!db) {
            console.error("DB is not open.");
            alert("データベース接続エラーが発生しました。");
            return;
        }
        const transaction = db.transaction(EXPENSE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(EXPENSE_STORE_NAME);
        const request = store.put(expenseData); // keyPathがあるのでIDで更新

        request.onsuccess = () => {
            console.log('Expense updated successfully:', expenseData);
            resetExpenseForm(); // フォームをリセット
            displayExpenses(); // 履歴テーブルを更新
            displaySummary(); // サマリーページを更新
            checkConsumables(); // 購入チェック
        };

        request.onerror = (event) => {
            console.error('Failed to update expense:', event.target.error);
            alert("費用の更新に失敗しました。");
        };
    }
    function deleteExpense(expenseId) {
        if (!db) {
            console.error("DB is not open.");
            alert("データベース接続エラーが発生しました。");
            return;
        }
        const transaction = db.transaction(EXPENSE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(EXPENSE_STORE_NAME);
        const request = store.delete(expenseId);

        request.onsuccess = () => {
            console.log('Expense deleted successfully:', expenseId);
            displayExpenses(); // 履歴テーブルを更新
            displaySummary(); // サマリーページを更新
        };

        request.onerror = (event) => {
            console.error('Failed to delete expense:', event.target.error);
            alert("費用の削除に失敗しました。");
        };
    }

    // --- フォーム操作関数 ---
    function loadExpenseForEdit(expenseId) {
        if (!db) return;
        const transaction = db.transaction(EXPENSE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(EXPENSE_STORE_NAME);
        const request = store.get(expenseId);

        request.onsuccess = (event) => {
            const expense = event.target.result;
            if (expense) {
                expenseIdInput.value = expense.id;
                expenseDateInput.value = expense.date;
                expenseCategoryInput.value = expense.category;
                expenseItemInput.value = expense.item;
                expenseAmountInput.value = expense.amount;
                expenseStoreInput.value = expense.store;

                // フォームの状態を編集モードに変更
                expenseFormTitle.textContent = '費用編集';
                addExpenseButton.classList.add('hidden');
                updateExpenseButton.classList.remove('hidden');
                cancelEditButton.classList.remove('hidden');

                // フォームのある場所にスクロール（任意）
                expenseEntryForm.scrollIntoView({ behavior: 'smooth' });
            } else {
                console.error('Expense not found for editing:', expenseId);
                alert('編集対象の費用が見つかりませんでした。');
            }
        };
        request.onerror = (event) => {
            console.error('Failed to load expense for edit:', event.target.error);
            alert('編集データの読み込みに失敗しました。');
        };
    }

    function resetExpenseForm() {
        expenseEntryForm.reset(); // フォームの内容をクリア
        expenseIdInput.value = ''; // 隠しIDもクリア
        expenseDateInput.valueAsDate = new Date(); // 日付を今日に
        expenseFormTitle.textContent = '費用入力'; // タイトルを戻す
        addExpenseButton.classList.remove('hidden'); // 追加ボタン表示
        updateExpenseButton.classList.add('hidden'); // 更新ボタン非表示
        cancelEditButton.classList.add('hidden'); // キャンセルボタン非表示
    }

    // --- サマリー表示関数 ---
    function displaySummary() {
        if (!db || !incomeSummaryDiv || !fixedCostSummaryDiv || !variableCostSummaryDiv) {
            // DB未接続または要素が見つからない場合は処理しない
            return;
        }

        const transaction = db.transaction(EXPENSE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(EXPENSE_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            const expenses = event.target.result;
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM 形式で当月を取得

            // 当月の費用のみをフィルタリング
            const currentMonthExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));

            // カテゴリ別に集計
            const summary = {
                fixed: 0,
                food: 0,
                daily: 0,
                medical: 0,
                other: 0,
                totalVariable: 0,
                total: 0
            };

            currentMonthExpenses.forEach(exp => {
                summary.total += exp.amount;
                switch (exp.category) {
                    case '固定費':
                        summary.fixed += exp.amount;
                        break;
                    case '食費':
                        summary.food += exp.amount;
                        summary.totalVariable += exp.amount;
                        break;
                    case '日用品':
                        summary.daily += exp.amount;
                        summary.totalVariable += exp.amount;
                        break;
                    case '病院代':
                        summary.medical += exp.amount;
                        summary.totalVariable += exp.amount;
                        break;
                    case 'その他雑費': // '交通費', '娯楽' などもここに含める（カテゴリ設計による）
                    default:
                        summary.other += exp.amount;
                        summary.totalVariable += exp.amount;
                        break;
                }
            });

            // HTMLに出力
            // TODO: 収入は未実装
            incomeSummaryDiv.innerHTML = `<h4>収入 (未実装)</h4><p>合計: - 円</p>`;

            fixedCostSummaryDiv.innerHTML = `
                <h4>固定費 (${currentMonth})</h4>
                <p>合計: ${summary.fixed.toLocaleString()} 円</p>
                <!-- TODO: 固定費の内訳表示 -->
            `;

            variableCostSummaryDiv.innerHTML = `
                <h4>変動費 (${currentMonth})</h4>
                <p><strong>合計: ${summary.totalVariable.toLocaleString()} 円</strong></p>
                <ul>
                    <li>食費: ${summary.food.toLocaleString()} 円</li>
                    <li>日用品: ${summary.daily.toLocaleString()} 円</li>
                    <li>病院代: ${summary.medical.toLocaleString()} 円</li>
                    <li>その他雑費: ${summary.other.toLocaleString()} 円</li>
                </ul>
                <!-- TODO: 予算との比較表示 -->
            `;

            console.log(`Summary updated for ${currentMonth}`);
        };

        request.onerror = (event) => {
            console.error('Failed to fetch expenses for summary:', event.target.error);
            fixedCostSummaryDiv.innerHTML = '<p style="color: red;">サマリーの読み込みに失敗しました。</p>';
            variableCostSummaryDiv.innerHTML = '';
            incomeSummaryDiv.innerHTML = '';
        };
    }

    // --- 購入サポート機能 ---
    const CONSUMABLE_CATEGORY = '日用品'; // 対象カテゴリ
    const NOTIFICATION_THRESHOLD_DAYS = 30; // 通知するまでの日数

    function checkConsumables() {
        if (!db || !notificationArea) return;

        const transaction = db.transaction(EXPENSE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(EXPENSE_STORE_NAME);
        const categoryIndex = store.index('category'); // カテゴリインデックスを使用
        const request = categoryIndex.getAll(CONSUMABLE_CATEGORY); // 定数を使用

        request.onsuccess = (event) => {
            const consumables = event.target.result;
            if (!consumables || consumables.length === 0) {
                notificationArea.textContent = '（通知はありません）';
                notificationArea.style.display = 'block'; // 表示はする
                notificationArea.style.color = ''; // エラー色をリセット
                return;
            }

            // 品目ごとに最新の購入日を記録
            const lastPurchaseDates = {};
            consumables.forEach(item => {
                if (item.item && item.date) { // 品名と日付があるもののみ
                    const itemName = item.item.trim();
                    if (!lastPurchaseDates[itemName] || item.date > lastPurchaseDates[itemName]) {
                        lastPurchaseDates[itemName] = item.date;
                    }
                }
            });

            // 一定期間購入がないものをリストアップ
            const today = new Date();
            const thresholdDate = new Date(today);
            thresholdDate.setDate(today.getDate() - NOTIFICATION_THRESHOLD_DAYS);
            const thresholdDateStr = thresholdDate.toISOString().slice(0, 10); // YYYY-MM-DD

            const itemsToNotify = [];
            for (const itemName in lastPurchaseDates) {
                if (lastPurchaseDates[itemName] < thresholdDateStr) {
                    itemsToNotify.push(itemName);
                }
            }

            // 通知エリアに表示
            if (itemsToNotify.length > 0) {
                notificationArea.innerHTML = `<strong>お知らせ：</strong> そろそろ購入が必要かもしれません: ${itemsToNotify.join(', ')}`;
                notificationArea.style.display = 'block';
                notificationArea.style.color = 'orange'; // 注意を促す色
            } else {
                notificationArea.textContent = '（通知はありません）';
                notificationArea.style.display = 'block'; // 表示はする
                notificationArea.style.color = ''; // エラー色などをリセット
            }
            console.log('Consumable check complete. Items to notify:', itemsToNotify);
        };

        request.onerror = (event) => {
            console.error('Failed to fetch consumables for notification:', event.target.error);
            notificationArea.textContent = '購入通知の確認中にエラーが発生しました。';
            notificationArea.style.display = 'block';
            notificationArea.style.color = 'red';
        };
    }

    // --- 購入サポート機能 ---
