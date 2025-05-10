document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const timerDisplay = document.getElementById('timer-display');
    const startBtn = document.getElementById('start-timer');
    const pauseBtn = document.getElementById('pause-timer');
    const resetBtn = document.getElementById('reset-timer');
    const modeButtons = document.querySelectorAll('.timer-mode');
    const progressBar = document.querySelector('.progress-bar');
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeModal = document.querySelector('.close-modal');
    const saveSettingsBtn = document.getElementById('save-settings');
    const newTaskInput = document.getElementById('new-task');
    const addTaskBtn = document.getElementById('add-task');
    const taskList = document.getElementById('task-list');
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Timer Variables
    let timer;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let currentMode = 'pomodoro';
    let isRunning = false;
    let pomodoroCount = 0;

    // Settings
    let settings = {
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        autoStartBreaks: true,
        autoStartPomodoros: false,
        longBreakInterval: 4,
        autoCheckTasks: false,
        autoSwitchTasks: true
    };

    // Load saved settings from localStorage
    function loadSettings() {
        const savedSettings = localStorage.getItem('pomodoroSettings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
            updateSettingsUI();
        }
    }

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    }

    // Update UI with current settings
    function updateSettingsUI() {
        document.getElementById('pomodoro-duration').value = settings.pomodoroDuration;
        document.getElementById('short-break-duration').value = settings.shortBreakDuration;
        document.getElementById('long-break-duration').value = settings.longBreakDuration;
        document.getElementById('auto-start-breaks').checked = settings.autoStartBreaks;
        document.getElementById('auto-start-pomodoros').checked = settings.autoStartPomodoros;
        document.getElementById('long-break-interval').value = settings.longBreakInterval;
        document.getElementById('interval-value').textContent = settings.longBreakInterval;
        document.getElementById('auto-check-tasks').checked = settings.autoCheckTasks;
        document.getElementById('auto-switch-tasks').checked = settings.autoSwitchTasks;
    }

    // Format time as MM:SS
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Update the timer display
    function updateDisplay() {
        timerDisplay.textContent = formatTime(timeLeft);
        const totalTime = currentMode === 'pomodoro' ? settings.pomodoroDuration * 60 :
                         currentMode === 'short-break' ? settings.shortBreakDuration * 60 :
                         settings.longBreakDuration * 60;
        const percentage = (timeLeft / totalTime) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    // Switch between timer modes
    function switchMode(mode) {
        currentMode = mode;
        
        // Update active button
        modeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });

        // Set time based on mode
        if (mode === 'pomodoro') {
            timeLeft = settings.pomodoroDuration * 60;
        } else if (mode === 'short-break') {
            timeLeft = settings.shortBreakDuration * 60;
        } else {
            timeLeft = settings.longBreakDuration * 60;
        }

        updateDisplay();
        
        // Auto-start if enabled
        if ((mode === 'short-break' || mode === 'long-break') && settings.autoStartBreaks) {
            startTimer();
        } else if (mode === 'pomodoro' && settings.autoStartPomodoros) {
            startTimer();
        } else {
            pauseTimer();
        }
    }

    // Start the timer
    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            timer = setInterval(() => {
                timeLeft--;
                updateDisplay();

                if (timeLeft <= 0) {
                    clearInterval(timer);
                    isRunning = false;
                    timerComplete();
                }
            }, 1000);
        }
    }

    // Pause the timer
    function pauseTimer() {
        clearInterval(timer);
        isRunning = false;
    }

    // Reset the timer
    function resetTimer() {
        pauseTimer();
        switchMode(currentMode);
    }

    // When timer completes
    function timerComplete() {
        // Play sound
        const audio = new Audio('notification.mp3');
        audio.play();

        // Show notification
        if (Notification.permission === 'granted') {
            new Notification(`Timer Complete!`, {
                body: `${currentMode === 'pomodoro' ? 'Time for a break!' : 'Time to get back to work!'}`
            });
        }

        // Update pomodoro count and switch mode
        if (currentMode === 'pomodoro') {
            pomodoroCount++;
            if (pomodoroCount % settings.longBreakInterval === 0) {
                switchMode('long-break');
            } else {
                switchMode('short-break');
            }
        } else {
            switchMode('pomodoro');
        }
    }

    // Task Management
    function addTask() {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            const taskId = Date.now();
            const taskItem = document.createElement('li');
            taskItem.dataset.id = taskId;
            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox">
                <span class="task-text">${taskText}</span>
                <div class="task-actions">
                    <button class="edit-task"><i class="fas fa-edit"></i></button>
                    <button class="delete-task"><i class="fas fa-trash"></i></button>
                </div>
            `;
            taskList.appendChild(taskItem);
            newTaskInput.value = '';
            saveTasks();
            
            // Add event listeners
            const checkbox = taskItem.querySelector('.task-checkbox');
            const editBtn = taskItem.querySelector('.edit-task');
            const deleteBtn = taskItem.querySelector('.delete-task');
            
            checkbox.addEventListener('change', function() {
                taskItem.classList.toggle('task-completed', this.checked);
                if (settings.autoCheckTasks && this.checked) {
                    setTimeout(() => {
                        taskItem.remove();
                        saveTasks();
                    }, 1000);
                }
                saveTasks();
            });
            
            editBtn.addEventListener('click', function() {
                const newText = prompt('Edit task:', taskText);
                if (newText !== null) {
                    taskItem.querySelector('.task-text').textContent = newText;
                    saveTasks();
                }
            });
            
            deleteBtn.addEventListener('click', function() {
                taskItem.remove();
                saveTasks();
            });
        }
    }

    // Save tasks to localStorage
    function saveTasks() {
        const tasks = [];
        document.querySelectorAll('#task-list li').forEach(task => {
            tasks.push({
                id: task.dataset.id,
                text: task.querySelector('.task-text').textContent,
                completed: task.querySelector('.task-checkbox').checked
            });
        });
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    }

    // Load tasks from localStorage
    function loadTasks() {
        const savedTasks = localStorage.getItem('pomodoroTasks');
        if (savedTasks) {
            const tasks = JSON.parse(savedTasks);
            tasks.forEach(task => {
                const taskItem = document.createElement('li');
                taskItem.dataset.id = task.id;
                taskItem.innerHTML = `
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-text">${task.text}</span>
                    <div class="task-actions">
                        <button class="edit-task"><i class="fas fa-edit"></i></button>
                        <button class="delete-task"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                if (task.completed) {
                    taskItem.classList.add('task-completed');
                }
                taskList.appendChild(taskItem);
                
                // Add event listeners
                const checkbox = taskItem.querySelector('.task-checkbox');
                const editBtn = taskItem.querySelector('.edit-task');
                const deleteBtn = taskItem.querySelector('.delete-task');
                
                checkbox.addEventListener('change', function() {
                    taskItem.classList.toggle('task-completed', this.checked);
                    if (settings.autoCheckTasks && this.checked) {
                        setTimeout(() => {
                            taskItem.remove();
                            saveTasks();
                        }, 1000);
                    }
                    saveTasks();
                });
                
                editBtn.addEventListener('click', function() {
                    const newText = prompt('Edit task:', task.text);
                    if (newText !== null) {
                        taskItem.querySelector('.task-text').textContent = newText;
                        saveTasks();
                    }
                });
                
                deleteBtn.addEventListener('click', function() {
                    taskItem.remove();
                    saveTasks();
                });
            });
        }
    }

    // Theme Toggle
    function toggleTheme() {
        const newTheme = html.dataset.theme === 'dark' ? 'light' : 'dark';
        html.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    }

    // Initialize the app
    function init() {
        // Load saved settings and tasks
        loadSettings();
        loadTasks();
        
        // Set initial mode
        switchMode('pomodoro');
        
        // Request notification permission
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        html.dataset.theme = savedTheme;
        themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    }

    // Event Listeners
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
    
    settingsBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });
    
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    saveSettingsBtn.addEventListener('click', () => {
        // Update settings from form
        settings.pomodoroDuration = parseInt(document.getElementById('pomodoro-duration').value);
        settings.shortBreakDuration = parseInt(document.getElementById('short-break-duration').value);
        settings.longBreakDuration = parseInt(document.getElementById('long-break-duration').value);
        settings.autoStartBreaks = document.getElementById('auto-start-breaks').checked;
        settings.autoStartPomodoros = document.getElementById('auto-start-pomodoros').checked;
        settings.longBreakInterval = parseInt(document.getElementById('long-break-interval').value);
        settings.autoCheckTasks = document.getElementById('auto-check-tasks').checked;
        settings.autoSwitchTasks = document.getElementById('auto-switch-tasks').checked;
        
        // Save and close
        saveSettings();
        modal.style.display = 'none';
        
        // Reset timer with new settings
        resetTimer();
    });
    
    // Range input event
    document.getElementById('long-break-interval').addEventListener('input', function() {
        document.getElementById('interval-value').textContent = this.value;
    });
    
    // Add task events
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Initialize the app
    init();
});
