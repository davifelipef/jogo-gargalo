import { database } from "./firebase-config.js";
import {
    ref,
    push,
    onValue,
    update,
    set
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const tasksRef = ref(database, "tasks");

const createTaskButton = document.querySelector("#create-task");
const resetGameButton = document.querySelector("#reset-game");
const completedTasksElement = document.querySelector("#completed-tasks");

const groupTasks = {
    1: document.querySelector("#group-1-tasks"),
    2: document.querySelector("#group-2-tasks"),
    3: document.querySelector("#group-3-tasks")
};

const timerIntervals = new Map();

const PROCESSING_TIME = 4000;

function clearTimerIntervals() {
    timerIntervals.forEach((interval) => {
        clearInterval(interval);
    });

    timerIntervals.clear();
}

function updateCompletedCounter(tasks) {
    const completedCount = Object.values(tasks)
        .filter((task) => task.group === 4)
        .length;

    completedTasksElement.textContent = `Concluídas: ${completedCount}`;
}

function setupTimer(id, task, card) {
    if (!task.startedAt || !task.duration) {
        return;
    }

    const timerElement = card.querySelector(".task-timer");

    function updateTimer() {
        const remaining = Math.max(
            0,
            task.startedAt + task.duration - Date.now()
        );

        const remainingSeconds = Math.ceil(remaining / 1000);

        if (remaining > 0) {
            timerElement.textContent = `Processando: ${remainingSeconds}s`;
            timerElement.classList.remove("ready");
            card.draggable = false;
            return;
        }

        timerElement.textContent = "Pronto";
        timerElement.classList.add("ready");

        card.draggable = true;

        const interval = timerIntervals.get(id);

        if (interval) {
            clearInterval(interval);
            timerIntervals.delete(id);
        }
    }

    updateTimer();

    if (Date.now() < task.startedAt + task.duration) {
        const interval = setInterval(updateTimer, 100);

        timerIntervals.set(id, interval);
    }
}

function renderTasks(tasks) {
    clearTimerIntervals();

    Object.values(groupTasks).forEach((container) => {
        container.innerHTML = "";
    });

    Object.entries(tasks).forEach(([id, task]) => {
        const card = document.createElement("article");

        card.className = "task";
        card.dataset.id = id;

        card.innerHTML = `
            <h3>Tarefa #${task.number}</h3>
        `;

        const container = groupTasks[task.group];

        if (!container) {
            return;
        }

        if (task.group === 1) {
            card.draggable = true;

            card.addEventListener("dragstart", (event) => {
                event.dataTransfer.setData("text/plain", id);
            });
        }

        if (task.group === 2) {
            card.draggable = false;

            card.innerHTML += `
                <div class="task-timer">Processando: ${PROCESSING_TIME / 1000}s</div>
            `;

            card.addEventListener("dragstart", (event) => {
                if (!card.draggable) {
                    event.preventDefault();
                    return;
                }

                event.dataTransfer.setData("text/plain", id);
            });

            setupTimer(id, task, card);
        }

        if (task.group === 3) {
            card.addEventListener("click", async () => {
                await update(ref(database, `tasks/${id}`), {
                    group: 4,
                    completedAt: Date.now()
                });
            });
        }

        container.appendChild(card);
    });
}

groupTasks[2].addEventListener("dragover", (event) => {
    event.preventDefault();
    groupTasks[2].classList.add("drag-over");
});

groupTasks[2].addEventListener("dragleave", () => {
    groupTasks[2].classList.remove("drag-over");
});

groupTasks[2].addEventListener("drop", async (event) => {
    event.preventDefault();

    groupTasks[2].classList.remove("drag-over");

    const taskId = event.dataTransfer.getData("text/plain");

    if (!taskId) {
        return;
    }

    await update(ref(database, `tasks/${taskId}`), {
        group: 2,
        startedAt: Date.now(),
        duration: PROCESSING_TIME
    });
});

groupTasks[3].addEventListener("dragover", (event) => {
    event.preventDefault();
    groupTasks[3].classList.add("drag-over");
});

groupTasks[3].addEventListener("dragleave", () => {
    groupTasks[3].classList.remove("drag-over");
});

groupTasks[3].addEventListener("drop", async (event) => {
    event.preventDefault();

    groupTasks[3].classList.remove("drag-over");

    const taskId = event.dataTransfer.getData("text/plain");

    if (!taskId) {
        return;
    }

    await update(ref(database, `tasks/${taskId}`), {
        group: 3
    });
});

resetGameButton.addEventListener("click", async () => {
    const confirmed = confirm(
        "Tem certeza que deseja resetar o jogo?\n\nTodas as tarefas serão apagadas."
    );

    if (!confirmed) {
        return;
    }

    await set(tasksRef, null);
});

onValue(tasksRef, (snapshot) => {
    const tasks = snapshot.val() || {};

    renderTasks(tasks);
    updateCompletedCounter(tasks);
});

createTaskButton.addEventListener("click", async () => {
    const snapshot = await new Promise((resolve, reject) => {
        onValue(tasksRef, resolve, reject, {
            onlyOnce: true
        });
    });

    const tasks = snapshot.val() || {};

    const numbers = Object.values(tasks)
        .map((task) => task.number)
        .filter((number) => Number.isInteger(number));

    const nextNumber = numbers.length > 0
        ? Math.max(...numbers) + 1
        : 1;

    await push(tasksRef, {
        number: nextNumber,
        group: 1,
        createdAt: Date.now()
    });
});