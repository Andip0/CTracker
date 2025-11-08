// State
let profile = {
    gender: '',
    age: 0,
    weight: 0,
    height: 0,
    activityLevel: 1.55
};

let goals = {
    maintenance: 0,
    deficit: 0,
    surplus: 0,
    calories: 0,
    protein: 0
};

let daily = {
    calories: 0,
    protein: 0,
    date: new Date().toDateString(),
    history: []
};

let savedFoods = [];
let estimatorItems = [];
let videoStream = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupEventListeners();
    checkNewDay();
});

function loadAllData() {
    // Load saved foods
    const savedFoodsData = localStorage.getItem('savedFoods');
    if (savedFoodsData) {
        savedFoods = JSON.parse(savedFoodsData);
    }

    // Load profile
    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) {
        profile = JSON.parse(savedProfile);
        
        // Restore profile inputs
        if (profile.age) document.getElementById('age').value = profile.age;
        if (profile.weight) document.getElementById('weight').value = profile.weight;
        if (profile.height) document.getElementById('height').value = profile.height;
        if (profile.activityLevel) document.getElementById('activityLevel').value = profile.activityLevel;
        if (profile.gender) {
            document.querySelectorAll('.gender-btn').forEach(btn => {
                if (btn.dataset.gender === profile.gender) {
                    btn.classList.add('active');
                }
            });
        }
    }

    // Load goals
    const savedGoals = localStorage.getItem('goals');
    if (savedGoals) {
        goals = JSON.parse(savedGoals);
    }

    // Load daily progress
    const savedDaily = localStorage.getItem('daily');
    if (savedDaily) {
        daily = JSON.parse(savedDaily);
    }

    // Load current screen
    const currentScreen = localStorage.getItem('currentScreen');
    if (currentScreen && currentScreen !== 'profileScreen') {
        showScreen(currentScreen);
        if (currentScreen === 'goalScreen') {
            updateGoalDisplay();
        } else if (currentScreen === 'trackerScreen') {
            updateGoalDisplay();
            updateTrackerDisplay();
        }
    }
}

function checkNewDay() {
    const today = new Date().toDateString();
    if (daily.date !== today) {
        daily = {
            calories: 0,
            protein: 0,
            date: today,
            history: []
        };
        saveAllData();
        if (localStorage.getItem('currentScreen') === 'trackerScreen') {
            updateDailyProgress();
        }
    }
}

function saveAllData() {
    localStorage.setItem('profile', JSON.stringify(profile));
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('daily', JSON.stringify(daily));
    localStorage.setItem('savedFoods', JSON.stringify(savedFoods));
    localStorage.setItem('currentScreen', document.querySelector('.screen.active').id);
}

function setupEventListeners() {
    // Profile Screen
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            profile.gender = e.target.dataset.gender;
        });
    });

    document.getElementById('calculateBtn').addEventListener('click', calculateGoals);

    // Goal Screen
    document.querySelectorAll('.goal-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const goalType = e.currentTarget.dataset.goal;
            selectGoal(goalType);
        });
    });

    // Tracker Screen
    document.getElementById('newDayBtn').addEventListener('click', newDay);
    document.getElementById('undoBtn').addEventListener('click', undoLastFood);
    document.getElementById('scanBtn').addEventListener('click', startCamera);
    document.getElementById('estimateBtn').addEventListener('click', openEstimator);
    document.getElementById('addFoodBtn').addEventListener('click', openAddFoodModal);

    // Camera Modal
    document.getElementById('cancelCamera').addEventListener('click', stopCamera);
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);

    // Add Food Modal
    document.getElementById('cancelAddFood').addEventListener('click', closeAddFoodModal);
    document.getElementById('saveFood').addEventListener('click', saveNewFood);

    // Estimator Modal
    document.getElementById('cancelEstimator').addEventListener('click', closeEstimator);
    document.getElementById('confirmEstimate').addEventListener('click', confirmEstimate);
}

function calculateGoals() {
    profile.age = parseFloat(document.getElementById('age').value);
    profile.weight = parseFloat(document.getElementById('weight').value);
    profile.height = parseFloat(document.getElementById('height').value);
    profile.activityLevel = parseFloat(document.getElementById('activityLevel').value);

    if (!profile.gender || !profile.age || !profile.weight || !profile.height) {
        alert('Please fill in all fields');
        return;
    }

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (profile.gender === 'male') {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    // Calculate TDEE using selected activity level
    goals.maintenance = Math.round(bmr * profile.activityLevel);
    goals.deficit = Math.round(goals.maintenance * 0.85); // 15% lower
    goals.surplus = Math.round(goals.maintenance * 1.20); // 20% higher
    goals.protein = Math.round(profile.weight * 1.7);

    saveAllData();
    updateGoalDisplay();
    showScreen('goalScreen');
}

function updateGoalDisplay() {
    document.getElementById('deficitCal').textContent = goals.deficit + ' cal';
    document.getElementById('maintenanceCal').textContent = goals.maintenance + ' cal';
    document.getElementById('surplusCal').textContent = goals.surplus + ' cal';
    document.getElementById('proteinGoal').textContent = goals.protein;
}

function selectGoal(goalType) {
    if (goalType === 'maintenance') {
        goals.calories = goals.maintenance;
    } else if (goalType === 'deficit') {
        goals.calories = goals.deficit;
    } else {
        goals.calories = goals.surplus;
    }

    saveAllData();
    updateTrackerDisplay();
    showScreen('trackerScreen');
}

function updateTrackerDisplay() {
    document.getElementById('targetCalories').textContent = goals.calories;
    document.getElementById('targetProtein').textContent = goals.protein;
    updateDailyProgress();
    renderSavedFoods();
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    saveAllData();
}

function updateDailyProgress() {
    document.getElementById('currentCalories').textContent = daily.calories;
    document.getElementById('currentProtein').textContent = daily.protein;

    // Update undo button state
    const undoBtn = document.getElementById('undoBtn');
    if (daily.history && daily.history.length > 0) {
        undoBtn.disabled = false;
    } else {
        undoBtn.disabled = true;
    }

    // Update circular progress for calories
    const calProgress = Math.min((daily.calories / goals.calories) * 100, 100);
    const calCircle = document.getElementById('caloriesCircle');
    const calCircumference = 2 * Math.PI * 54;
    const calOffset = calCircumference - (calProgress / 100) * calCircumference;
    calCircle.style.strokeDasharray = calCircumference;
    calCircle.style.strokeDashoffset = calOffset;

    // Update circular progress for protein
    const proProgress = Math.min((daily.protein / goals.protein) * 100, 100);
    const proCircle = document.getElementById('proteinCircle');
    const proCircumference = 2 * Math.PI * 54;
    const proOffset = proCircumference - (proProgress / 100) * proCircumference;
    proCircle.style.strokeDasharray = proCircumference;
    proCircle.style.strokeDashoffset = proOffset;
}

function addToDaily(calories, protein) {
    // Add to history for undo functionality
    if (!daily.history) {
        daily.history = [];
    }
    daily.history.push({ calories, protein });
    
    daily.calories += calories;
    daily.protein += protein;
    daily.date = new Date().toDateString();
    saveAllData();
    updateDailyProgress();
}

function undoLastFood() {
    if (!daily.history || daily.history.length === 0) {
        return;
    }
    
    // Get the last food entry
    const lastEntry = daily.history.pop();
    
    // Subtract it from totals
    daily.calories -= lastEntry.calories;
    daily.protein -= lastEntry.protein;
    
    // Ensure we don't go negative
    if (daily.calories < 0) daily.calories = 0;
    if (daily.protein < 0) daily.protein = 0;
    
    saveAllData();
    updateDailyProgress();
}

function newDay() {
    if (confirm('Start a new day? This will reset your daily intake to 0.')) {
        daily = {
            calories: 0,
            protein: 0,
            date: new Date().toDateString(),
            history: []
        };
        saveAllData();
        updateDailyProgress();
    }
}

// Saved Foods Management
function renderSavedFoods() {
    const list = document.getElementById('savedFoodsList');
    
    if (savedFoods.length === 0) {
        list.innerHTML = '<p class="empty-message">No saved foods yet. Add some!</p>';
        return;
    }

    list.innerHTML = savedFoods.map(food => `
        <div class="food-item">
            <div class="food-info">
                <div class="food-name">${food.name}</div>
                <div class="food-stats">${food.calories} cal • ${food.protein}g protein</div>
            </div>
            <div class="food-actions">
                <button class="btn-small btn-add" onclick="addSavedFood(${food.id})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <button class="btn-small btn-remove" onclick="deleteSavedFood(${food.id})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function openAddFoodModal() {
    document.getElementById('addFoodModal').classList.add('active');
    document.getElementById('foodName').value = '';
    document.getElementById('foodCalories').value = '';
    document.getElementById('foodProtein').value = '';
}

function closeAddFoodModal() {
    document.getElementById('addFoodModal').classList.remove('active');
}

function saveNewFood() {
    const name = document.getElementById('foodName').value.trim();
    const calories = parseFloat(document.getElementById('foodCalories').value);
    const protein = parseFloat(document.getElementById('foodProtein').value);

    if (!name || !calories || !protein) {
        alert('Please fill in all fields');
        return;
    }

    savedFoods.push({
        id: Date.now(),
        name: name,
        calories: calories,
        protein: protein
    });

    saveAllData();
    renderSavedFoods();
    closeAddFoodModal();
}

function addSavedFood(id) {
    const food = savedFoods.find(f => f.id === id);
    if (food) {
        addToDaily(food.calories, food.protein);
    }
}

function deleteSavedFood(id) {
    if (confirm('Delete this food?')) {
        savedFoods = savedFoods.filter(f => f.id !== id);
        saveAllData();
        renderSavedFoods();
    }
}

// Camera Functions
async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        const video = document.getElementById('video');
        video.srcObject = videoStream;
        document.getElementById('cameraModal').classList.add('active');
    } catch (err) {
        alert('Unable to access camera. Please allow camera permissions.');
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    document.getElementById('cameraModal').classList.remove('active');
}

async function capturePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    stopCamera();
    
    await analyzeFood(imageData);
}

async function analyzeFood(imageData) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg',
                                data: imageData.split(',')[1]
                            }
                        },
                        {
                            type: 'text',
                            text: 'Analyze this food image and estimate the total calories and protein in grams. Respond ONLY with a JSON object in this exact format with no other text: {"calories": number, "protein": number, "foodName": "brief description"}'
                        }
                    ]
                }]
            })
        });

        const data = await response.json();
        const text = data.content.find(c => c.type === 'text')?.text || '';
        const cleaned = text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleaned);
        
        if (result.calories && result.protein) {
            addToDaily(result.calories, result.protein);
            alert(`Added: ${result.foodName}\n${result.calories} cal, ${result.protein}g protein`);
        }
    } catch (err) {
        console.error('Analysis error:', err);
        alert('Failed to analyze food. Please try again or add manually.');
    }
}

// Estimator Functions
function openEstimator() {
    estimatorItems = [];
    renderEstimatorItems();
    renderEstimatorFoodsList();
    document.getElementById('estimatorModal').classList.add('active');
}

function closeEstimator() {
    document.getElementById('estimatorModal').classList.remove('active');
    estimatorItems = [];
}

function renderEstimatorFoodsList() {
    const list = document.getElementById('estimatorFoodsList');
    
    if (savedFoods.length === 0) {
        list.innerHTML = '<p class="empty-message">No saved foods available</p>';
        return;
    }

    list.innerHTML = savedFoods.map(food => `
        <div class="food-item-estimator" onclick="addToEstimator(${food.id})">
            <div class="food-info">
                <div class="food-name">${food.name}</div>
                <div class="food-stats">${food.calories} cal • ${food.protein}g protein</div>
            </div>
        </div>
    `).join('');
}

function addToEstimator(id) {
    const food = savedFoods.find(f => f.id === id);
    if (food) {
        estimatorItems.push({...food});
        renderEstimatorItems();
    }
}

function removeFromEstimator(index) {
    estimatorItems.splice(index, 1);
    renderEstimatorItems();
}

function renderEstimatorItems() {
    const list = document.getElementById('estimatorItems');
    const totalDiv = document.getElementById('estimatorTotal');
    const confirmBtn = document.getElementById('confirmEstimate');
    
    if (estimatorItems.length === 0) {
        list.innerHTML = '<p class="empty-message">Select foods from your saved items</p>';
        totalDiv.style.display = 'none';
        confirmBtn.disabled = true;
        return;
    }

    list.innerHTML = estimatorItems.map((item, index) => `
        <div class="food-item">
            <div class="food-info">
                <div class="food-name">${item.name}</div>
                <div class="food-stats">${item.calories} cal • ${item.protein}g protein</div>
            </div>
            <div class="food-actions">
                <button class="btn-small btn-remove" onclick="removeFromEstimator(${index})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    const totalCal = estimatorItems.reduce((sum, item) => sum + item.calories, 0);
    const totalPro = estimatorItems.reduce((sum, item) => sum + item.protein, 0);

    document.getElementById('estimatorTotalCal').textContent = totalCal;
    document.getElementById('estimatorTotalPro').textContent = totalPro;
    totalDiv.style.display = 'block';
    confirmBtn.disabled = false;
}

function confirmEstimate() {
    const totalCal = estimatorItems.reduce((sum, item) => sum + item.calories, 0);
    const totalPro = estimatorItems.reduce((sum, item) => sum + item.protein, 0);
    
    addToDaily(totalCal, totalPro);
    closeEstimator();
}