document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const timerDisplay = document.getElementById('timer');
    const timerControl = document.getElementById('timer-control');
    const taskNumber = document.getElementById('task-number');
    const currentTaskName = document.getElementById('current-task-name');
    const tasksList = document.getElementById('tasks-list');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const editModal = document.getElementById('edit-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const saveSettingsBtn = document.getElementById('save-settings');
    const saveTaskBtn = document.getElementById('save-task');
    const deleteTaskBtn = document.getElementById('delete-task');
    const editTaskInput = document.getElementById('edit-task-input');
    const editTaskPomodoros = document.getElementById('edit-task-pomodoros');
    const html = document.documentElement;

    // Timer Variables
    let timer;
    let isRunning = false;
    let currentMode = 'pomodoro';
    let timeLeft = 50 * 60; // 50 minutes in seconds
    let pomodoroCount = 0;
    let currentTask = null;
    let tasks = [];
    let editingTaskId = null;

    // Settings
    let settings = {
        pomodoroDuration: 50,
        shortBreakDuration: 10,
        longBreakDuration: 15,
        autoStartBreaks: true,
        autoStartPomodoros: false,
        longBreakInterval: 4
    };

    // Initialize the app
    function init() {
        loadSettings();
        loadTasks();
        updateTimerDisplay();
        updateTheme();
        
        // Set up event listeners
        timerControl.addEventListener('click', toggleTimer);
        addTaskBtn.addEventListener('click', addTask);
        newTaskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });
        settingsBtn.addEventListener('click', () => openModal(settingsModal));
        saveSettingsBtn.addEventListener('click', saveSettings);
        saveTaskBtn.addEventListener('click', saveEditedTask);
        deleteTaskBtn.addEventListener('click', deleteTask);
        
        closeModalButtons.forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });
        
        document.getElementById('long-break-interval').addEventListener('input', function() {
            document.getElementById('interval-value').textContent = this.value;
        });
        
        // Request notification permission
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    // Timer Functions
    function toggleTimer() {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            timerControl.textContent = 'PAUSE';
            timer = setInterval(updateTimer, 1000);
        }
    }

    function pauseTimer() {
        clearInterval(timer);
        isRunning = false;
        timerControl.textContent = 'START';
    }

    function resetTimer() {
        pauseTimer();
        timeLeft = getDuration() * 60;
        updateTimerDisplay();
    }

    function updateTimer() {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            timerComplete();
        }
    }

    function timerComplete() {
        clearInterval(timer);
        isRunning = false;
        
        // Play sound and show notification
        playSound();
        showNotification();
        
        // Update pomodoro count for current task
        if (currentTask) {
            currentTask.completedPomodoros++;
            if (currentTask.completedPomodoros >= currentTask.totalPomodoros) {
                currentTask.completed = true;
                const taskElement = document.querySelector(`[data-id="${currentTask.id}"]`);
                if (taskElement) {
                    taskElement.classList.add('completed');
                    taskElement.querySelector('.task-checkbox').checked = true;
                }
            }
            saveTasks();
        }
        
        // Switch mode based on current mode
        pomodoroCount++;
        if (currentMode === 'pomodoro') {
            if (pomodoroCount % settings.longBreakInterval === 0) {
                switchMode('long-break');
            } else {
                switchMode('short-break');
            }
        } else {
            switchMode('pomodoro');
        }
    }

    function switchMode(mode) {
        currentMode = mode;
        timeLeft = getDuration() * 60;
        updateTimerDisplay();
        updateTheme();
        
        // Auto-start if enabled
        if ((mode === 'short-break' || mode === 'long-break') && settings.autoStartBreaks) {
            startTimer();
        } else if (mode === 'pomodoro' && settings.autoStartPomodoros) {
            startTimer();
        } else {
            pauseTimer();
        }
    }

    function getDuration() {
        switch (currentMode) {
            case 'pomodoro': return settings.pomodoroDuration;
            case 'short-break': return settings.shortBreakDuration;
            case 'long-break': return settings.longBreakDuration;
            default: return 25;
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateTheme() {
        html.setAttribute('data-theme', currentMode);
    }

    // Task Functions
    function addTask() {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            const task = {
                id: Date.now(),
                text: taskText,
                totalPomodoros: 1,
                completedPomodoros: 0,
                completed: false
            };
            
            tasks.push(task);
            renderTask(task);
            newTaskInput.value = '';
            
            // If no current task, set this as current
            if (!currentTask) {
                setCurrentTask(task);
            }
            
            saveTasks();
        }
    }

    function renderTask(task) {
        const taskElement = document.createElement('li');
        taskElement.className = 'task-item';
        taskElement.dataset.id = task.id;
        
        taskElement.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text">${task.text}</span>
            <span class="task-pomodoros">${task.completedPomodoros}/${task.totalPomodoros}</span>
            <div class="task-actions">
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
            </div>
        `;
        
        // Add event listeners
        const checkbox = taskElement.querySelector('.task-checkbox');
        const editBtn = taskElement.querySelector('.edit-btn');
        
        checkbox.addEventListener('change', function() {
            task.completed = this.checked;
            if (this.checked) {
                taskElement.classList.add('completed');
                if (currentTask && currentTask.id === task.id) {
                    setCurrentTask(findNextTask());
                }
            } else {
                taskElement.classList.remove('completed');
            }
            saveTasks();
        });
        
        editBtn.addEventListener('click', () => openEditModal(task));
        
        taskElement.addEventListener('click', function(e) {
            if (e.target !== checkbox && e.target !== editBtn && !editBtn.contains(e.target)) {
                if (!task.completed) {
                    setCurrentTask(task);
                    resetTimer();
                }
            }
        });
        
        tasksList.appendChild(taskElement);
    }

    function setCurrentTask(task) {
        currentTask = task;
        if (task) {
            currentTaskName.textContent = task.text;
            taskNumber.textContent = `#${tasks.findIndex(t => t.id === task.id) + 1}`;
        } else {
            currentTaskName.textContent = 'No current task';
            taskNumber.textContent = '#0';
        }
    }

    function findNextTask() {
        return tasks.find(task => !task.completed);
    }

    function openEditModal(task) {
        editingTaskId = task.id;
        editTaskInput.value = task.text;
        editTaskPomodoros.value = task.totalPomodoros;
        openModal(editModal);
    }

    function saveEditedTask() {
        const task = tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.text = editTaskInput.value.trim();
            task.totalPomodoros = parseInt(editTaskPomodoros.value) || 1;
            
            // Update in DOM
            const taskElement = document.querySelector(`[data-id="${task.id}"]`);
            if (taskElement) {
                taskElement.querySelector('.task-text').textContent = task.text;
                taskElement.querySelector('.task-pomodoros').textContent = 
                    `${task.completedPomodoros}/${task.totalPomodoros}`;
            }
            
            // Update current task if needed
            if (currentTask && currentTask.id === task.id) {
                currentTaskName.textContent = task.text;
            }
            
            saveTasks();
            closeAllModals();
        }
    }

    function deleteTask() {
        tasks = tasks.filter(t => t.id !== editingTaskId);
        const taskElement = document.querySelector(`[data-id="${editingTaskId}"]`);
        if (taskElement) {
            taskElement.classList.add('fade-out');
            setTimeout(() => {
                taskElement.remove();
                // If deleting current task, find a new one
                if (currentTask && currentTask.id === editingTaskId) {
                    setCurrentTask(findNextTask());
                    resetTimer();
                }
                saveTasks();
            }, 300);
        }
        closeAllModals();
    }

    // Modal Functions
    function openModal(modal) {
        modal.style.display = 'flex';
    }

    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Settings Functions
    function loadSettings() {
        const savedSettings = localStorage.getItem('pomodoroSettings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
            updateSettingsUI();
        }
    }

    function saveSettings() {
        settings.pomodoroDuration = parseInt(document.getElementById('pomodoro-duration').value) || 25;
        settings.shortBreakDuration = parseInt(document.getElementById('short-break-duration').value) || 5;
        settings.longBreakDuration = parseInt(document.getElementById('long-break-duration').value) || 15;
        settings.autoStartBreaks = document.getElementById('auto-start-breaks').checked;
        settings.autoStartPomodoros = document.getElementById('auto-start-pomodoros').checked;
        settings.longBreakInterval = parseInt(document.getElementById('long-break-interval').value) || 4;
        
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
        closeAllModals();
        resetTimer();
    }

    function updateSettingsUI() {
        document.getElementById('pomodoro-duration').value = settings.pomodoroDuration;
        document.getElementById('short-break-duration').value = settings.shortBreakDuration;
        document.getElementById('long-break-duration').value = settings.longBreakDuration;
        document.getElementById('auto-start-breaks').checked = settings.autoStartBreaks;
        document.getElementById('auto-start-pomodoros').checked = settings.autoStartPomodoros;
        document.getElementById('long-break-interval').value = settings.longBreakInterval;
        document.getElementById('interval-value').textContent = settings.longBreakInterval;
    }

    // Storage Functions
    function loadTasks() {
        const savedTasks = localStorage.getItem('pomodoroTasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
            tasks.forEach(task => renderTask(task));
            
            // Set current task if available
            if (tasks.length > 0) {
                const firstIncomplete = tasks.find(task => !task.completed);
                setCurrentTask(firstIncomplete || null);
            }
        }
    }

    function saveTasks() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    }

    // Notification Functions
    function playSound() {
        const audio = new Audio('notification.mp3');
        audio.play().catch(e => console.log('Audio playback failed:', e));
    }

    function showNotification() {
        if (Notification.permission === 'granted') {
            const title = currentMode === 'pomodoro' ? 'Time for a break!' : 'Time to work!';
            const body = currentMode === 'pomodoro' 
                ? 'Your pomodoro session is complete. Take a break!'
                : 'Your break is over. Time to focus!';
            
            new Notification(title, { body });
        }
    }

    // Initialize the app
    init();
});
