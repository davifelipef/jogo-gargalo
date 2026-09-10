import { database, auth } from "./firebase-config.js";
import {
    ref,
    push,
    onValue,
    update,
    set,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const ADMIN_EMAIL = "admin@jogogargalo.local";
const ADMIN_UID = "E6PwNFPsmcVYLn6bm6HHZkyAxFd2";

const tasksRef = ref(database, "tasks");
const configRef = ref(database, "game/config");
const serverTimeOffsetRef = ref(database, ".info/serverTimeOffset");

const createTaskButton = document.querySelector("#create-task");
const resetGameButton = document.querySelector("#reset-game");

const roundElement = document.querySelector("#round");
const wipElement = document.querySelector("#wip");
const processingTimeElement = document.querySelector("#processing-time");

const completedTasksElement = document.querySelector("#completed-tasks");
const completedTasksCount = completedTasksElement.querySelector("strong");

const settingsButton = document.querySelector("#settings");

const adminModal = document.querySelector("#admin-modal");
const closeAdminModalButton = document.querySelector("#close-admin-modal");
const adminModalTitle = document.querySelector("#admin-modal-title");

const loginForm = document.querySelector("#login-form");
const adminPasswordInput = document.querySelector("#admin-password");
const loginError = document.querySelector("#login-error");
const adminLoginButton = document.querySelector("#admin-login");

const settingsForm = document.querySelector("#settings-form");
const roundInput = document.querySelector("#round-input");
const wipInput = document.querySelector("#wip-input");
const unlimitedWipInput = document.querySelector("#unlimited-wip");
const settingsProcessingTime = document.querySelector("#settings-processing-time");
const saveSettingsButton = document.querySelector("#save-settings");
const adminLogoutButton = document.querySelector("#admin-logout");

const groupTasks = {
    1: document.querySelector("#group-1-tasks"),
    2: document.querySelector("#group-2-tasks"),
    3: document.querySelector("#group-3-tasks")
};

const timerIntervals = new Map();

const DEFAULT_CONFIG = {
    round: 1,
    wip: null,
    processingTime: 4000
};

let serverTimeOffset = 0;
let currentConfig = { ...DEFAULT_CONFIG };
let currentTasks = {};
let isAdmin = false;

onValue(serverTimeOffsetRef, (snapshot) => {
    serverTimeOffset = snapshot.val() || 0;
});

function getServerTime() {
    return Date.now() + serverTimeOffset;
}

function clearTimerIntervals() {
    timerIntervals.forEach((interval) => {
        clearInterval(interval);
    });

    timerIntervals.clear();
}

function updateGameStatus(config) {
    const round = Number.isInteger(config.round)
        ? config.round
        : DEFAULT_CONFIG.round;

    const wip = config.wip;

    const processingTime = Number.isFinite(config.processingTime)
        ? config.processingTime
        : DEFAULT_CONFIG.processingTime;

    roundElement.textContent = `Rodada ${round}`;

    wipElement.textContent = wip === null
        ? "WIP: ∞"
        : `WIP: ${wip}`;

    processingTimeElement.textContent =
        `Processamento: ${processingTime / 1000}s`;
}

function updateCompletedCounter(tasks) {
    const completedCount = Object.values(tasks)
        .filter((task) => task.group === 4)
        .length;

    completedTasksCount.textContent = completedCount;

    completedTasksElement.classList.toggle(
        "has-completed",
        completedCount > 0
    );
}

function getProcessingTaskCount() {
    return Object.values(currentTasks)
        .filter((task) => task.group === 2)
        .length;
}

function isProcessingFull() {
    if (currentConfig.wip === null) {
        return false;
    }

    return getProcessingTaskCount() >= currentConfig.wip;
}

function setupTimer(id, task, card) {
    if (!task.startedAt || !task.duration) {
        return;
    }

    const timerElement = card.querySelector(".task-timer");

    function updateTimer() {
        const remaining = Math.max(
            0,
            task.startedAt + task.duration - getServerTime()
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

    if (getServerTime() < task.startedAt + task.duration) {
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
                <div class="task-timer">
                    Processando: ${currentConfig.processingTime / 1000}s
                </div>
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
                    completedAt: serverTimestamp()
                });
            });
        }

        container.appendChild(card);
    });
}

function updateSettingsPreview() {
    if (unlimitedWipInput.checked) {
        settingsProcessingTime.textContent = "4s";
        wipInput.disabled = true;
        return;
    }

    const wip = Number(wipInput.value);

    if (!Number.isInteger(wip) || wip < 1) {
        settingsProcessingTime.textContent = "-";
        return;
    }

    settingsProcessingTime.textContent = `${wip * 4}s`;
}

function openAdminModal() {
    adminModal.classList.remove("hidden");

    if (isAdmin) {
        showSettingsForm();
        return;
    }

    showLoginForm();
}

function closeAdminModal() {
    adminModal.classList.add("hidden");
}

function showLoginForm() {
    adminModalTitle.textContent = "Acesso administrativo";

    loginForm.classList.remove("hidden");
    settingsForm.classList.add("hidden");

    adminPasswordInput.value = "";
    loginError.classList.add("hidden");

    setTimeout(() => {
        adminPasswordInput.focus();
    }, 0);
}

function showSettingsForm() {
    adminModalTitle.textContent = "Configurações";

    loginForm.classList.add("hidden");
    settingsForm.classList.remove("hidden");

    roundInput.value = currentConfig.round;

    if (currentConfig.wip === null) {
        unlimitedWipInput.checked = true;
        wipInput.disabled = true;
        wipInput.value = "";
    } else {
        unlimitedWipInput.checked = false;
        wipInput.disabled = false;
        wipInput.value = currentConfig.wip;
    }

    updateSettingsPreview();
}

function setAdminState(value) {
    isAdmin = value;

    resetGameButton.disabled = !isAdmin;

    settingsButton.textContent = isAdmin
        ? "Configurações ✓"
        : "Configurações";
}

async function loginAdmin() {
    const password = adminPasswordInput.value;

    if (!password) {
        loginError.textContent = "Digite a senha.";
        loginError.classList.remove("hidden");
        return;
    }

    adminLoginButton.disabled = true;
    loginError.classList.add("hidden");

    try {
        const credential = await signInWithEmailAndPassword(
            auth,
            ADMIN_EMAIL,
            password
        );

        if (credential.user.uid !== ADMIN_UID) {
            await signOut(auth);

            throw new Error("Usuário administrativo inválido.");
        }

        setAdminState(true);
        showSettingsForm();
    } catch (error) {
        loginError.textContent = "Senha incorreta.";
        loginError.classList.remove("hidden");
    } finally {
        adminLoginButton.disabled = false;
    }
}

async function logoutAdmin() {
    await signOut(auth);
}

async function saveSettings() {
    if (!isAdmin) {
        return;
    }

    const round = Number(roundInput.value);

    if (!Number.isInteger(round) || round < 1) {
        alert("A rodada deve ser um número inteiro maior que zero.");
        return;
    }

    let wip = null;
    let processingTime = 4000;

    if (!unlimitedWipInput.checked) {
        wip = Number(wipInput.value);

        if (!Number.isInteger(wip) || wip < 1) {
            alert("O WIP deve ser um número inteiro maior que zero.");
            return;
        }

        processingTime = wip * 4000;
    }

    saveSettingsButton.disabled = true;

    try {
        await set(configRef, {
            round,
            wip,
            processingTime,
            updatedAt: serverTimestamp()
        });

        closeAdminModal();
    } catch (error) {
        alert("Não foi possível salvar as configurações.");
        console.error(error);
    } finally {
        saveSettingsButton.disabled = false;
    }
}

groupTasks[2].addEventListener("dragover", (event) => {
    if (isProcessingFull()) {
        groupTasks[2].classList.remove("drag-over");
        return;
    }

    event.preventDefault();
    groupTasks[2].classList.add("drag-over");
});

groupTasks[2].addEventListener("dragleave", () => {
    groupTasks[2].classList.remove("drag-over");
});

groupTasks[2].addEventListener("drop", async (event) => {
    event.preventDefault();

    groupTasks[2].classList.remove("drag-over");

    if (isProcessingFull()) {
        return;
    }

    const taskId = event.dataTransfer.getData("text/plain");

    if (!taskId) {
        return;
    }

    const task = currentTasks[taskId];

    if (!task || task.group !== 1) {
        return;
    }

    await update(ref(database, `tasks/${taskId}`), {
        group: 2,
        startedAt: serverTimestamp(),
        duration: currentConfig.processingTime
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

    const task = currentTasks[taskId];

    if (!task || task.group !== 2) {
        return;
    }

    await update(ref(database, `tasks/${taskId}`), {
        group: 3
    });
});

resetGameButton.addEventListener("click", async () => {
    if (!isAdmin) {
        return;
    }

    const confirmed = confirm(
        "Tem certeza que deseja resetar o jogo?\n\nTodas as tarefas serão apagadas."
    );

    if (!confirmed) {
        return;
    }

    await set(tasksRef, null);
});

onValue(tasksRef, (snapshot) => {
    currentTasks = snapshot.val() || {};

    renderTasks(currentTasks);
    updateCompletedCounter(currentTasks);
});

onValue(configRef, (snapshot) => {
    const config = snapshot.val();

    currentConfig = {
        ...DEFAULT_CONFIG,
        ...(config || {})
    };

    updateGameStatus(currentConfig);

    if (isAdmin) {
        showSettingsForm();
    }
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
        createdAt: serverTimestamp()
    });
});

settingsButton.addEventListener("click", () => {
    openAdminModal();
});

closeAdminModalButton.addEventListener("click", () => {
    closeAdminModal();
});

adminLoginButton.addEventListener("click", loginAdmin);

adminPasswordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        loginAdmin();
    }
});

unlimitedWipInput.addEventListener("change", () => {
    wipInput.disabled = unlimitedWipInput.checked;
    updateSettingsPreview();
});

wipInput.addEventListener("input", updateSettingsPreview);

saveSettingsButton.addEventListener("click", saveSettings);

adminLogoutButton.addEventListener("click", logoutAdmin);

adminModal.addEventListener("click", (event) => {
    if (event.target === adminModal) {
        closeAdminModal();
    }
});

onAuthStateChanged(auth, (user) => {
    const authenticatedAsAdmin =
        user !== null && user.uid === ADMIN_UID;

    setAdminState(authenticatedAsAdmin);

    if (authenticatedAsAdmin) {
        showSettingsForm();
    } else if (!adminModal.classList.contains("hidden")) {
        showLoginForm();
    }
});