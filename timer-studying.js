document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const timerDisplay = document.getElementById('timer-display');
    const startBtn = document.getElementById('start-timer');
    const taskList = document.getElementById('task-list');
    const newTaskInput = document.getElementById('new-task');
    const addTaskBtn = document.getElementById('add-task');
    const currentTaskName = document.querySelector('.task-name');
    const currentTaskNumber = document.querySelector('.task-number');

    // Timer Variables
    let timer;
    let timeLeft = 50 * 60; // 50 minutes in seconds
    let isRunning = false;
    let currentTaskIndex = 1;

    // Format time as MM:SS
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Update the timer display
    function updateDisplay() {
        timerDisplay.textContent = formatTime(timeLeft);
    }

    // Start the timer
    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            startBtn.textContent = 'PAUSE';
            timer = setInterval(() => {
                timeLeft--;
                updateDisplay();

                if (timeLeft <= 0) {
                    clearInterval(timer);
                    isRunning = false;
                    timerComplete();
                }
            }, 1000);
        } else {
            pauseTimer();
        }
    }

    // Pause the timer
    function pauseTimer() {
        clearInterval(timer);
        isRunning = false;
        startBtn.textContent = 'START';
    }

    // Reset the timer
    function resetTimer() {
        pauseTimer();
        timeLeft = 50 * 60;
        updateDisplay();
    }

    // When timer completes
    function timerComplete() {
        // Play sound
        const audio = new Audio('notification.mp3');
        audio.play();

        // Show notification
        if (Notification.permission === 'granted') {
            new Notification(`Timer Complete!`, {
                body: `Time for a break!`
            });
        }

        // Move to next task if available
        const nextTask = document.querySelector('.task-item:not(.completed)');
        if (nextTask) {
            nextTask.click();
        } else {
            resetTimer();
        }
    }

    // Add new task
    function addTask() {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            const taskId = Date.now();
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <input type="checkbox" id="task-${taskId}">
                <label for="task-${taskId}">
                    <span class="task-text">${taskText}</span>
                    <span class="task-progress">0/1</span>
                </label>
            `;
            taskList.appendChild(taskItem);
            newTaskInput.value = '';
            
            // Add click event to update current task
            taskItem.addEventListener('click', function() {
                const checkbox = this.querySelector('input');
                if (!checkbox.checked) {
                    currentTaskName.textContent = this.querySelector('.task-text').textContent;
                    currentTaskIndex = Array.from(taskList.children).indexOf(this) + 1;
                    currentTaskNumber.textContent = `#${currentTaskIndex}`;
                    resetTimer();
                }
            });
        }
    }

    // Initialize
    updateDisplay();

    // Event Listeners
    startBtn.addEventListener('click', startTimer);
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Request notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
});
