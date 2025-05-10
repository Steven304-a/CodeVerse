// Timer configuration
const TIMER_CONFIG = {
    'study': 25 * 60,
    'short-break': 5 * 60,
    'long-break': 15 * 60
};

// Timer state
let timeLeft = TIMER_CONFIG.study;
let timerId = null;
let isRunning = false;
let currentTimerType = 'study';

// Pomodoro cycle state
let pomodoroCount = 0;
let tickingAudio = null;
let autoBreakUsed = false;

// Utility functions that don't depend on DOM
function getSettings() {
    return JSON.parse(localStorage.getItem('pomodoroSettings')) || DEFAULTS;
}

function showNotification() {
    if (Notification.permission === 'granted') {
        new Notification('Pomodoro Timer', {
            body: 'Time is up! Take a break.',
            icon: 'https://icons.iconarchive.com/icons/paomedia/small-n-flat/1024/clock-icon.png'
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

function requestNotificationPermission() {
    if (Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timerDisplay = document.querySelector('.timer-display');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const tasksList = document.getElementById('tasks-list');
    const timerTypeBtns = document.querySelectorAll('.timer-type-btn');
    const alarmSound = document.getElementById('alarm-sound');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
    const pomodoroTimeInput = document.getElementById('pomodoro-time');
    const shortBreakTimeInput = document.getElementById('short-break-time');
    const longBreakTimeInput = document.getElementById('long-break-time');
    const autoStartBreaks = document.getElementById('auto-start-breaks');
    const autoStartPomodoros = document.getElementById('auto-start-pomodoros');
    const longBreakInterval = document.getElementById('long-break-interval');
    const autoCheckTasks = document.getElementById('auto-check-tasks');
    const autoSwitchTasks = document.getElementById('auto-switch-tasks');
    const alarmSoundSelect = document.getElementById('alarm-sound-select');
    const alarmVolume = document.getElementById('alarm-volume');
    const tickingSoundSelect = document.getElementById('ticking-sound-select');
    const tickingVolume = document.getElementById('ticking-volume');
    const progressCircle = document.querySelector('.progress-ring__circle');
    const progressCircleBg = document.querySelector('.progress-ring__circle-bg');
    const tasksProgress = document.querySelector('.tasks-progress');

    // Progress ring constants
    const RADIUS = 70;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    progressCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;
    progressCircle.style.strokeDashoffset = '0';
    progressCircleBg.style.strokeDasharray = `${CIRCUMFERENCE}`;
    progressCircleBg.style.strokeDashoffset = '0';

    function setProgress(percent) {
        const offset = CIRCUMFERENCE - percent * CIRCUMFERENCE;
        progressCircle.style.strokeDashoffset = offset;
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        // Animate progress ring
        let total = TIMER_CONFIG[currentTimerType];
        setProgress((total - timeLeft) / total);
    }

    function updateTasksProgress() {
        const all = tasksList.querySelectorAll('.task-checkbox');
        const done = tasksList.querySelectorAll('.task-checkbox:checked');
        const percent = all.length ? done.length / all.length : 0;
        tasksProgress.style.width = `${percent * 100}%`;
    }

    // Timer controls
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    // Task management
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Timer type buttons event listeners
    timerTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isRunning) {
                if (!confirm('Timer is running. Are you sure you want to switch?')) {
                    return;
                }
                stopTimer();
            }
            // Update active button
            timerTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Update timer type and reset
            currentTimerType = btn.dataset.type;
            timeLeft = TIMER_CONFIG[currentTimerType];
            updateTimerDisplay();
        });
    });

    // Settings modal open/close
    settingsBtn.addEventListener('click', () => {
        loadSettings();
        settingsModal.classList.add('active');
    });
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', () => {
            loadSettings();
            settingsModal.classList.remove('active');
        });
    }
    saveSettingsBtn.addEventListener('click', () => {
        saveSettings();
        applySettings(true);
        settingsModal.classList.remove('active');
        requestNotificationPermission();
    });

    // Update task progress bar on load and on change
    updateTasksProgress();
    tasksList.addEventListener('change', updateTasksProgress);

    // Load tasks on page load
    loadTasks();
    requestNotificationPermission();
    updateTimerDisplay();

    // Save tasks on any change
    new MutationObserver(saveTasks).observe(tasksList, {childList: true, subtree: true});

    // All other functions (startTimer, stopTimer, etc.) should use these DOM variables
    function startTimer(auto = false) {
        if (!isRunning) {
            isRunning = true;
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            const settings = getSettings();
            // Play ticking sound if enabled
            if (settings.tickingSound !== 'none') {
                if (tickingAudio) tickingAudio.pause();
                let tickSrc = '';
                if (settings.tickingSound === 'classic') tickSrc = 'https://cdn.pixabay.com/audio/2022/10/16/audio_12b6b7b6e2.mp3';
                if (settings.tickingSound === 'modern') tickSrc = 'https://cdn.pixabay.com/audio/2022/10/16/audio_12b6b7b6e2.mp3';
                if (tickSrc) {
                    tickingAudio = new Audio(tickSrc);
                    tickingAudio.loop = true;
                    tickingAudio.volume = settings.tickingVolume / 100;
                    tickingAudio.play();
                }
            }
            timerId = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft === 0) {
                    stopTimer();
                    alarmSound.pause();
                    alarmSound.currentTime = 0;
                    alarmSound.play();
                    showNotification();
                    handleSessionEnd();
                }
            }, 1000);
        }
    }

    function pauseTimer() {
        if (isRunning) {
            isRunning = false;
            clearInterval(timerId);
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        }
    }

    function stopTimer() {
        isRunning = false;
        clearInterval(timerId);
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        if (tickingAudio) {
            tickingAudio.pause();
            tickingAudio = null;
        }
    }

    function resetTimer() {
        stopTimer();
        timeLeft = TIMER_CONFIG[currentTimerType];
        updateTimerDisplay();
    }

    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText) {
            const taskItem = createTaskElement(taskText, '', 'Normal', '', false);
            tasksList.appendChild(taskItem);
            taskInput.value = '';
            saveTasks();
            // Add animation
            taskItem.style.opacity = '0';
            taskItem.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                taskItem.style.opacity = '1';
                taskItem.style.transform = 'translateX(0)';
            }, 10);
        }
    }

    function createTaskElement(text, due = '', priority = 'Normal', description = '', completed = false) {
        const li = document.createElement('li');
        li.className = 'task-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = completed;
        checkbox.addEventListener('change', saveTasks);
        const content = document.createElement('span');
        content.className = 'task-content';
        content.textContent = text;
        const dueSpan = document.createElement('span');
        dueSpan.className = 'task-due';
        dueSpan.textContent = due;
        dueSpan.title = 'Due date';
        dueSpan.style.marginLeft = '0.5rem';
        dueSpan.style.fontSize = '0.9em';
        dueSpan.style.color = '#888';
        const prioritySpan = document.createElement('span');
        prioritySpan.className = 'task-priority';
        prioritySpan.textContent = priority;
        prioritySpan.title = 'Priority';
        prioritySpan.style.marginLeft = '0.5rem';
        prioritySpan.style.fontWeight = 'bold';
        prioritySpan.style.color = priority === 'High' ? 'var(--accent-color)' : (priority === 'Low' ? 'var(--primary-color)' : '#888');
        const descSpan = document.createElement('span');
        descSpan.className = 'task-desc';
        descSpan.textContent = description;
        descSpan.title = 'Description';
        descSpan.style.display = 'block';
        descSpan.style.fontSize = '0.9em';
        descSpan.style.color = '#666';
        descSpan.style.marginTop = '0.2rem';
        const actions = document.createElement('div');
        actions.className = 'task-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'task-btn edit';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.onclick = () => editTask(li);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-btn delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = () => deleteTask(li);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        li.appendChild(checkbox);
        li.appendChild(content);
        li.appendChild(dueSpan);
        li.appendChild(prioritySpan);
        li.appendChild(descSpan);
        li.appendChild(actions);
        return li;
    }

    function editTask(taskItem) {
        const content = taskItem.querySelector('.task-content');
        const dueSpan = taskItem.querySelector('.task-due');
        const prioritySpan = taskItem.querySelector('.task-priority');
        const descSpan = taskItem.querySelector('.task-desc');
        // Create editable fields
        const input = document.createElement('input');
        input.type = 'text';
        input.value = content.textContent;
        input.className = 'modern-input';
        input.style.marginBottom = '0.2rem';
        const dueInput = document.createElement('input');
        dueInput.type = 'date';
        dueInput.value = dueSpan.textContent;
        dueInput.className = 'modern-input';
        dueInput.style.marginBottom = '0.2rem';
        const prioritySelect = document.createElement('select');
        prioritySelect.className = 'modern-input';
        ['Low','Normal','High'].forEach(opt => {
            const o = document.createElement('option');
            o.value = o.textContent = opt;
            if (prioritySpan.textContent === opt) o.selected = true;
            prioritySelect.appendChild(o);
        });
        prioritySelect.style.marginBottom = '0.2rem';
        const descInput = document.createElement('textarea');
        descInput.value = descSpan.textContent;
        descInput.className = 'modern-input';
        descInput.rows = 2;
        descInput.style.marginBottom = '0.2rem';
        // Replace spans with inputs
        content.replaceWith(input);
        dueSpan.replaceWith(dueInput);
        prioritySpan.replaceWith(prioritySelect);
        descSpan.replaceWith(descInput);
        input.focus();
        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText) {
                const newContent = document.createElement('span');
                newContent.className = 'task-content';
                newContent.textContent = newText;
                input.replaceWith(newContent);
                const newDue = document.createElement('span');
                newDue.className = 'task-due';
                newDue.textContent = dueInput.value;
                newDue.title = 'Due date';
                newDue.style.marginLeft = '0.5rem';
                newDue.style.fontSize = '0.9em';
                newDue.style.color = '#888';
                dueInput.replaceWith(newDue);
                const newPriority = document.createElement('span');
                newPriority.className = 'task-priority';
                newPriority.textContent = prioritySelect.value;
                newPriority.title = 'Priority';
                newPriority.style.marginLeft = '0.5rem';
                newPriority.style.fontWeight = 'bold';
                newPriority.style.color = prioritySelect.value === 'High' ? 'var(--accent-color)' : (prioritySelect.value === 'Low' ? 'var(--primary-color)' : '#888');
                prioritySelect.replaceWith(newPriority);
                const newDesc = document.createElement('span');
                newDesc.className = 'task-desc';
                newDesc.textContent = descInput.value;
                newDesc.title = 'Description';
                newDesc.style.display = 'block';
                newDesc.style.fontSize = '0.9em';
                newDesc.style.color = '#666';
                newDesc.style.marginTop = '0.2rem';
                descInput.replaceWith(newDesc);
                saveTasks();
            } else {
                deleteTask(taskItem);
            }
        };
        input.addEventListener('blur', saveEdit);
        dueInput.addEventListener('blur', saveEdit);
        prioritySelect.addEventListener('blur', saveEdit);
        descInput.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveEdit(); });
        descInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveEdit(); });
    }

    function deleteTask(taskItem) {
        taskItem.style.opacity = '0';
        taskItem.style.transform = 'translateX(20px)';
        setTimeout(() => {
            taskItem.remove();
            saveTasks();
        }, 300);
    }

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
        tasksList.innerHTML = '';
        tasks.forEach(task => {
            const taskItem = createTaskElement(task.text, task.due, task.priority, task.description, task.completed);
            tasksList.appendChild(taskItem);
        });
    }

    function saveTasks() {
        const tasks = Array.from(tasksList.children).map(li => {
            return {
                text: li.querySelector('.task-content').textContent,
                due: li.querySelector('.task-due')?.textContent || '',
                priority: li.querySelector('.task-priority')?.textContent || '',
                description: li.querySelector('.task-desc')?.textContent || '',
                completed: li.querySelector('.task-checkbox').checked
            };
        });
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    }

    // Settings logic
    const DEFAULTS = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        autoStartBreaks: false,
        autoStartPomodoros: false,
        longBreakInterval: 4,
        autoCheckTasks: false,
        autoSwitchTasks: true,
        alarmSound: 'kitchen',
        alarmVolume: 50,
        tickingSound: 'none',
        tickingVolume: 50
    };

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('pomodoroSettings')) || DEFAULTS;
        pomodoroTimeInput.value = settings.pomodoro;
        shortBreakTimeInput.value = settings.shortBreak;
        longBreakTimeInput.value = settings.longBreak;
        autoStartBreaks.checked = settings.autoStartBreaks;
        autoStartPomodoros.checked = settings.autoStartPomodoros;
        longBreakInterval.value = settings.longBreakInterval;
        autoCheckTasks.checked = settings.autoCheckTasks;
        autoSwitchTasks.checked = settings.autoSwitchTasks;
        alarmSoundSelect.value = settings.alarmSound;
        alarmVolume.value = settings.alarmVolume;
        tickingSoundSelect.value = settings.tickingSound;
        tickingVolume.value = settings.tickingVolume;
    }

    function saveSettings() {
        const settings = {
            pomodoro: parseFloat(pomodoroTimeInput.value),
            shortBreak: parseInt(shortBreakTimeInput.value),
            longBreak: parseInt(longBreakTimeInput.value),
            autoStartBreaks: autoStartBreaks.checked,
            autoStartPomodoros: autoStartPomodoros.checked,
            longBreakInterval: parseInt(longBreakInterval.value),
            autoCheckTasks: autoCheckTasks.checked,
            autoSwitchTasks: autoSwitchTasks.checked,
            alarmSound: alarmSoundSelect.value,
            alarmVolume: parseInt(alarmVolume.value),
            tickingSound: tickingSoundSelect.value,
            tickingVolume: parseInt(tickingVolume.value)
        };
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    }

    function applySettings(forceUpdate = false) {
        // Update timer config
        TIMER_CONFIG.study = Math.round(parseFloat(pomodoroTimeInput.value) * 60);
        TIMER_CONFIG['short-break'] = Math.round(parseInt(shortBreakTimeInput.value) * 60);
        TIMER_CONFIG['long-break'] = Math.round(parseInt(longBreakTimeInput.value) * 60);
        // Update alarm sound
        let alarmSrc = 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3';
        if (alarmSoundSelect.value === 'bell') alarmSrc = 'https://cdn.pixabay.com/audio/2022/07/26/audio_124bfa4c7e.mp3';
        if (alarmSoundSelect.value === 'kitchen') alarmSrc = 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3';
        if (alarmSoundSelect.value === 'digital') alarmSrc = 'https://cdn.pixabay.com/audio/2022/07/26/audio_124bfa4c7e.mp3';
        alarmSound.src = alarmSrc;
        alarmSound.volume = alarmVolume.value / 100;
        // TODO: implement ticking sound
        // Immediately update timer and UI if requested
        if (forceUpdate) {
            timeLeft = TIMER_CONFIG[currentTimerType];
            updateTimerDisplay();
        }
    }

    function handleSessionEnd() {
        const settings = getSettings();
        // Play the selected alarm sound (force reload) for Pomodoro, short break, and long break
        let alarmSrc = 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3';
        if (settings.alarmSound === 'bell') alarmSrc = 'https://cdn.pixabay.com/audio/2022/07/26/audio_124bfa4c7e.mp3';
        if (settings.alarmSound === 'kitchen') alarmSrc = 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3';
        if (settings.alarmSound === 'digital') alarmSrc = 'https://cdn.pixabay.com/audio/2022/07/26/audio_124bfa4c7e.mp3';
        alarmSound.pause();
        alarmSound.currentTime = 0;
        alarmSound.src = alarmSrc;
        alarmSound.volume = settings.alarmVolume / 100;
        alarmSound.load();
        alarmSound.play();
        if (currentTimerType === 'study') {
            pomodoroCount++;
            // Auto check current task
            if (settings.autoCheckTasks) {
                const firstTask = tasksList.querySelector('.task-checkbox:not(:checked)');
                if (firstTask) firstTask.checked = true;
                saveTasks();
            }
            // Auto switch task
            if (settings.autoSwitchTasks) {
                const firstTask = tasksList.querySelector('.task-checkbox:not(:checked)');
                if (firstTask) {
                    const next = firstTask.closest('li').nextElementSibling;
                    if (next) next.scrollIntoView({behavior:'smooth'});
                }
            }
            // Always go to short break, except after N pomodoros, go to long break
            if (settings.longBreakInterval && pomodoroCount % settings.longBreakInterval === 0) {
                if (settings.autoStartBreaks && !autoBreakUsed) {
                    autoBreakUsed = true;
                    switchSession('long-break', true);
                } else {
                    switchSession('long-break', false);
                }
            } else {
                if (settings.autoStartBreaks && !autoBreakUsed) {
                    autoBreakUsed = true;
                    switchSession('short-break', true);
                } else {
                    switchSession('short-break', false);
                }
            }
        } else {
            // After any break, always return to Pomodoro, do not auto start
            autoBreakUsed = false;
            switchSession('study', false);
        }
    }

    function switchSession(type, autoStart) {
        currentTimerType = type;
        timeLeft = TIMER_CONFIG[type];
        updateTimerDisplay();
        timerTypeBtns.forEach(b => b.classList.remove('active'));
        const btn = Array.from(timerTypeBtns).find(b => b.dataset.type === type);
        if (btn) btn.classList.add('active');
        if (autoStart) startTimer(true);
    }
});
