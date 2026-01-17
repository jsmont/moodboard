// IndexedDB setup
let db;
let currentMoodboardId = null;
const DB_NAME = 'moodboard';
const DB_VERSION = 2;
const STORES = {
    MOODBOARDS: 'moodboards',
    IMAGES: 'images',
    SETTINGS: 'settings'
};

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Delete old stores if they exist
            if (db.objectStoreNames.contains('images')) {
                db.deleteObjectStore('images');
            }

            // Create moodboards store
            if (!db.objectStoreNames.contains(STORES.MOODBOARDS)) {
                const moodboardStore = db.createObjectStore(STORES.MOODBOARDS, { keyPath: 'id', autoIncrement: true });
                moodboardStore.createIndex('name', 'name', { unique: true });
            }

            // Create images store
            if (!db.objectStoreNames.contains(STORES.IMAGES)) {
                const imageStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'id', autoIncrement: true });
                imageStore.createIndex('moodboardId', 'moodboardId', { unique: false });
                imageStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Create settings store
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }
        };
    });
}

// Moodboard management functions
async function createMoodboard(name) {
    const transaction = db.transaction([STORES.MOODBOARDS], 'readwrite');
    const store = transaction.objectStore(STORES.MOODBOARDS);
    const moodboard = {
        name: name,
        createdAt: Date.now(),
        lastModified: Date.now()
    };
    return new Promise((resolve, reject) => {
        const request = store.add(moodboard);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllMoodboards() {
    const transaction = db.transaction([STORES.MOODBOARDS], 'readonly');
    const store = transaction.objectStore(STORES.MOODBOARDS);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getCurrentMoodboardId() {
    const transaction = db.transaction([STORES.SETTINGS], 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    return new Promise((resolve, reject) => {
        const request = store.get('currentMoodboard');
        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => reject(request.error);
    });
}

async function setCurrentMoodboard(id) {
    const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    return new Promise((resolve, reject) => {
        const request = store.put({ key: 'currentMoodboard', value: id });
        request.onsuccess = () => {
            currentMoodboardId = id;
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

async function getMoodboard(id) {
    const transaction = db.transaction([STORES.MOODBOARDS], 'readonly');
    const store = transaction.objectStore(STORES.MOODBOARDS);
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updateMoodboardName(id, newName) {
    const transaction = db.transaction([STORES.MOODBOARDS], 'readwrite');
    const store = transaction.objectStore(STORES.MOODBOARDS);
    const moodboard = await getMoodboard(id);
    moodboard.name = newName;
    moodboard.lastModified = Date.now();
    return new Promise((resolve, reject) => {
        const request = store.put(moodboard);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteMoodboardDB(id) {
    const transaction = db.transaction([STORES.MOODBOARDS, STORES.IMAGES], 'readwrite');
    const moodboardStore = transaction.objectStore(STORES.MOODBOARDS);
    const imageStore = transaction.objectStore(STORES.IMAGES);
    const imageIndex = imageStore.index('moodboardId');

    // Delete all images for this moodboard
    const images = await new Promise((resolve, reject) => {
        const request = imageIndex.getAll(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    for (const image of images) {
        await new Promise((resolve, reject) => {
            const request = imageStore.delete(image.id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Delete the moodboard
    return new Promise((resolve, reject) => {
        const request = moodboardStore.delete(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Image management functions
async function saveImage(dataUrl) {
    if (!currentMoodboardId) {
        throw new Error('No moodboard selected');
    }
    const transaction = db.transaction([STORES.IMAGES], 'readwrite');
    const store = transaction.objectStore(STORES.IMAGES);
    const image = {
        moodboardId: currentMoodboardId,
        dataUrl: dataUrl,
        timestamp: Date.now()
    };
    return new Promise((resolve, reject) => {
        const request = store.add(image);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadImagesFromDB(moodboardId) {
    const id = moodboardId || currentMoodboardId;
    if (!id) return [];

    const transaction = db.transaction([STORES.IMAGES], 'readonly');
    const store = transaction.objectStore(STORES.IMAGES);
    const index = store.index('moodboardId');
    return new Promise((resolve, reject) => {
        const request = index.getAll(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteImage(id) {
    const transaction = db.transaction([STORES.IMAGES], 'readwrite');
    const store = transaction.objectStore(STORES.IMAGES);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function displayImage(imageData) {
    const boardItem = document.createElement('div');
    boardItem.className = 'board-item';
    boardItem.dataset.imageId = imageData.id;

    const img = document.createElement('img');
    img.src = imageData.dataUrl;
    img.loading = 'lazy';

    img.onload = function() {
        const aspectRatio = this.naturalWidth / this.naturalHeight;
        const randomScale = 150 + Math.random() * 100;
        boardItem.style.flexBasis = `${aspectRatio * randomScale}px`;
    };

    boardItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, imageData.id);
    });

    boardItem.appendChild(img);
    return boardItem;
}
