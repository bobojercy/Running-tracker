const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { recognizeRunningData, validateRunningData } = require('./ocr');
const os = require('os');
const { getConfig, saveConfig, updateRunnerGroup, getGroupStats, initConfig } = require('./config');

// 初始化配置
initConfig();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 禁用静态文件缓存（确保 HTML 总是最新）
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }
}));
// 图片压缩中间件（锐化处理，减小文件大小）
const sharp = require('sharp');
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d', // 缓存 1 天
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));
app.use('/data', express.static(path.join(__dirname, '../data')));

// 确保目录存在
const uploadsDir = path.join(__dirname, '../uploads');
const dataDir = path.join(__dirname, '../data');
[uploadsDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 数据存储文件
const DATA_FILE = path.join(dataDir, 'runs.json');

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ runs: [] }, null, 2));
}

// 读取数据
function loadRuns() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data).runs || [];
  } catch (error) {
    console.error('读取数据失败:', error);
    return [];
  }
}

// 保存数据
function saveRuns(runs) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ runs, updatedAt: new Date().toISOString() }, null, 2));
}

// 文件上传配置（带图片压缩）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

// 图片压缩函数
async function compressImage(inputPath, outputPath) {
  try {
    const metadata = await sharp(inputPath).metadata();
    const maxSize = 1920; // 最大边长
    
    let pipeline = sharp(inputPath);
    
    // 如果图片过大，进行缩放
    if (metadata.width > maxSize || metadata.height > maxSize) {
      pipeline = pipeline.resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // 压缩并保存
    await pipeline
      .jpeg({ quality: 80, progressive: true })
      .toFile(outputPath);
    
    console.log(`✅ 图片压缩完成：${path.basename(inputPath)} (${Math.round(metadata.width)}x${Math.round(metadata.height)})`);
    return true;
  } catch (error) {
    console.error('⚠️ 图片压缩失败:', error.message);
    return false;
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// API: 预览识别结果（不保存）
app.post('/api/preview', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传截图文件' });
    }

    const { runner } = req.body;
    // 日期由 OCR 自动识别，不需要前端传递
    if (!runner) {
      return res.status(400).json({ error: '请选择跑步人员' });
    }

    // 压缩图片
    const compressedPath = req.file.path.replace(/\.(\w+)$/, '_compressed.$1');
    await compressImage(req.file.path, compressedPath);
    
    const ocrResult = await recognizeRunningData(req.file.path);
    const validation = validateRunningData(ocrResult);
    
    res.json({
      success: true,
      data: {
        runner: runner,
        date: ocrResult.date,  // OCR 识别的日期
        distance: ocrResult.distance,
        pace: ocrResult.pace,
        paceMinPerKm: ocrResult.paceMinPerKm,
        duration: ocrResult.duration,
        calories: ocrResult.calories,
        rawText: ocrResult.rawText,
        imageFilename: req.file.filename.replace(/\.(\w+)$/, '_compressed.$1')
      },
      validation
    });

  } catch (error) {
    console.error('预览识别失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 添加缓存控制中间件
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// API: 保存确认后的数据
app.post('/api/save', async (req, res) => {
  try {
    const { runner, runDate, distance, pace, duration, calories, rawOcrText, imageFilename, date } = req.body;
    
    // 日期优先使用 OCR 识别的 date 字段，其次使用 runDate
    const finalDate = date || runDate;
    
    if (!runner || !finalDate) {
      return res.status(400).json({ error: '人员和日期必填' });
    }
    
    // 解析配速
    let paceMinPerKm = 0;
    if (pace) {
      const paceMatch = pace.match(/(\d+)'(\d+)/);
      if (paceMatch) {
        paceMinPerKm = parseInt(paceMatch[1]) + parseInt(paceMatch[2]) / 60;
      }
    }
    
    const validation = validateRunningData({
      distance,
      paceMinPerKm,
      pace
    });
    
    // 如果数据无效，拒绝保存并返回明确原因
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: '数据无效，无法保存',
        validationErrors: validation.errors 
      });
    }
    
    // 检查一人一天是否已存在有效记录
    const runs = loadRuns();
    const existingRun = runs.find(r => r.runner === runner && r.date === runDate && r.isValid);
    if (existingRun) {
      return res.status(400).json({ 
        error: `今日已提交过有效记录`,
        validationErrors: [`${runner} 在 ${runDate} 已有一条有效记录，无需重复提交`]
      });
    }
    
    const runRecord = {
      id: uuidv4(),
      runner: runner,
      date: runDate,
      distance: distance,
      pace: pace,
      paceMinPerKm: paceMinPerKm,
      duration: duration,
      calories: calories,
      imageUrl: imageFilename ? `/uploads/${imageFilename}` : '',
      isValid: validation.isValid,
      validationErrors: validation.errors,
      rawOcrText: rawOcrText || '',
      createdAt: new Date().toISOString()
    };

    runs.push(runRecord);
    saveRuns(runs);

    res.json({ success: true, data: runRecord });

  } catch (error) {
    console.error('保存失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: 上传截图并识别（旧接口，保留兼容）
app.post('/api/upload', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传截图文件' });
    }

    const { runner } = req.body;
    // 日期由 OCR 自动识别
    if (!runner) {
      return res.status(400).json({ error: '请选择跑步人员' });
    }

    // 压缩图片（保留原图用于 OCR，压缩图用于展示）
    const compressedPath = req.file.path.replace(/\.(\w+)$/, '_compressed.$1');
    await compressImage(req.file.path, compressedPath);
    
    const ocrResult = await recognizeRunningData(req.file.path);
    const validation = validateRunningData(ocrResult);
    
    // 使用压缩后的图片 URL
    const compressedFilename = req.file.filename.replace(/\.(\w+)$/, '_compressed.$1');
    const runRecord = {
      id: uuidv4(),
      runner: runner,
      date: runDate,
      distance: ocrResult.distance,
      pace: ocrResult.pace,
      paceMinPerKm: ocrResult.paceMinPerKm,
      duration: ocrResult.duration,
      calories: ocrResult.calories,
      imageUrl: `/uploads/${compressedFilename}`,
      isValid: validation.isValid,
      validationErrors: validation.errors,
      rawOcrText: ocrResult.rawText,
      createdAt: new Date().toISOString()
    };

    const runs = loadRuns();
    runs.push(runRecord);
    saveRuns(runs);

    res.json({ success: true, data: runRecord, validation });

  } catch (error) {
    console.error('上传处理失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: 获取所有记录
app.get('/api/runs', (req, res) => {
  const runs = loadRuns();
  const { validOnly, runner, group } = req.query;
  
  let result = runs;
  if (validOnly === 'true') {
    result = runs.filter(r => r.isValid);
  }
  
  // 获取组别对应的人员列表
  if (group) {
    const config = getConfig();
    const groupRunners = config.runners.filter(r => r.group === group).map(r => r.name);
    result = result.filter(r => groupRunners.includes(r.runner));
  }
  
  if (runner) {
    result = result.filter(r => r.runner === runner);
  }
  if (validOnly === 'true') {
    result = runs.filter(r => r.isValid);
  }
  
  result.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ runs: result });
});

// API: 删除记录
app.delete('/api/runs/:id', (req, res) => {
  const { id } = req.params;
  let runs = loadRuns();
  const initialLength = runs.length;
  runs = runs.filter(r => r.id !== id);
  
  if (runs.length === initialLength) {
    return res.status(404).json({ error: '记录不存在' });
  }
  
  saveRuns(runs);
  res.json({ success: true });
});

// API: 按天统计
app.get('/api/stats/daily', (req, res) => {
  const { limit = 30, runner, group } = req.query;
  let runs = loadRuns().filter(r => r.isValid);
  
  // 按组别筛选
  if (group) {
    const config = getConfig();
    const groupRunners = config.runners.filter(r => r.group === group).map(r => r.name);
    runs = runs.filter(r => groupRunners.includes(r.runner));
  }
  
  // 按人员筛选
  if (runner) {
    runs = runs.filter(r => r.runner === runner);
  }
  
  const byDate = {};
  runs.forEach(run => {
    const date = run.date;
    if (!byDate[date]) {
      byDate[date] = { date, distance: 0, runs: 0, calories: 0 };
    }
    byDate[date].distance += run.distance || 0;
    byDate[date].runs += 1;
    byDate[date].calories += run.calories || 0;
  });
  
  const stats = Object.values(byDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, parseInt(limit));
  
  res.json({ stats });
});

// API: 按月统计
app.get('/api/stats/monthly', (req, res) => {
  const { runner, group } = req.query;
  let runs = loadRuns().filter(r => r.isValid);
  
  // 按组别筛选
  if (group) {
    const config = getConfig();
    const groupRunners = config.runners.filter(r => r.group === group).map(r => r.name);
    runs = runs.filter(r => groupRunners.includes(r.runner));
  }
  
  // 按人员筛选
  if (runner) {
    runs = runs.filter(r => r.runner === runner);
  }
  
  const byMonth = {};
  runs.forEach(run => {
    const month = run.date.substring(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = { month, distance: 0, runs: 0, calories: 0 };
    }
    byMonth[month].distance += run.distance || 0;
    byMonth[month].runs += 1;
    byMonth[month].calories += run.calories || 0;
  });
  
  const stats = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
  res.json({ stats });
});

// API: 总跑量排名
app.get('/api/stats/total', (req, res) => {
  const { runner, group } = req.query;
  let runs = loadRuns().filter(r => r.isValid);
  
  // 按组别筛选
  if (group) {
    const config = getConfig();
    const groupRunners = config.runners.filter(r => r.group === group).map(r => r.name);
    runs = runs.filter(r => groupRunners.includes(r.runner));
  }
  
  // 按人员筛选
  if (runner) {
    runs = runs.filter(r => r.runner === runner);
  }
  
  const total = {
    totalDistance: 0,
    totalRuns: 0,
    totalCalories: 0,
    avgDistance: 0,
    avgPace: 0,
    bestDistance: 0,
    bestDate: null
  };
  
  if (runs.length > 0) {
    total.totalDistance = runs.reduce((sum, r) => sum + (r.distance || 0), 0);
    total.totalRuns = runs.length;
    total.totalCalories = runs.reduce((sum, r) => sum + (r.calories || 0), 0);
    total.avgDistance = total.totalDistance / total.totalRuns;
    
    const validPaces = runs.filter(r => r.paceMinPerKm).map(r => r.paceMinPerKm);
    total.avgPace = validPaces.length > 0 ? validPaces.reduce((a, b) => a + b, 0) / validPaces.length : 0;
    
    const bestRun = runs.reduce((max, r) => (r.distance || 0) > (max.distance || 0) ? r : max, runs[0]);
    total.bestDistance = bestRun?.distance || 0;
    total.bestDate = bestRun?.date || null;
  }
  
  res.json({ total });
});

// API: 按人员统计
app.get('/api/stats/by-runner', (req, res) => {
  const { group, runner } = req.query;
  let runs = loadRuns().filter(r => r.isValid);
  
  // 按组别筛选
  if (group) {
    const config = getConfig();
    const groupRunners = config.runners.filter(r => r.group === group).map(r => r.name);
    runs = runs.filter(r => groupRunners.includes(r.runner));
  }
  
  // 按人员筛选
  if (runner) {
    runs = runs.filter(r => r.runner === runner);
  }
  
  const byRunner = {};
  runs.forEach(run => {
    const runner = run.runner;
    if (!byRunner[runner]) {
      byRunner[runner] = { runner, distance: 0, runs: 0, calories: 0, avgPace: 0, paces: [] };
    }
    byRunner[runner].distance += run.distance || 0;
    byRunner[runner].runs += 1;
    byRunner[runner].calories += run.calories || 0;
    if (run.paceMinPerKm) {
      byRunner[runner].paces.push(run.paceMinPerKm);
    }
  });
  
  // 计算平均配速
  Object.values(byRunner).forEach(r => {
    if (r.paces.length > 0) {
      r.avgPace = r.paces.reduce((a, b) => a + b, 0) / r.paces.length;
    }
    delete r.paces;
  });
  
  const stats = Object.values(byRunner).sort((a, b) => b.distance - a.distance);
  res.json({ stats });
});

// API: 获取人员配置
app.get('/api/config', (req, res) => {
  const config = getConfig();
  res.json(config);
});

// API: 更新人员组别或新增人员
app.post('/api/config/runner', (req, res) => {
  const { runner, group, action, newName } = req.body;
  
  const config = getConfig();
  
  // 新增人员
  if (action === 'add') {
    if (!runner || !group) {
      return res.status(400).json({ error: '人员和组别必填' });
    }
    const exists = config.runners.find(r => r.name === runner);
    if (exists) {
      return res.status(400).json({ error: '该人员已存在' });
    }
    
    config.runners.push({ name: runner, group: group });
    saveConfig(config);
    return res.json({ success: true });
  }
  
  // 修改人员姓名
  if (action === 'rename') {
    if (!runner || !newName) {
      return res.status(400).json({ error: '原姓名和新姓名必填' });
    }
    
    const exists = config.runners.find(r => r.name === newName);
    if (exists) {
      return res.status(400).json({ error: '该姓名已存在' });
    }
    
    const runnerObj = config.runners.find(r => r.name === runner);
    if (!runnerObj) {
      return res.status(404).json({ error: '人员不存在' });
    }
    
    // 更新配置中的人员姓名
    runnerObj.name = newName;
    
    // 更新跑步记录中的人员姓名
    const runsData = loadRuns();
    runsData.forEach(run => {
      if (run.runner === runner) {
        run.runner = newName;
      }
    });
    
    // 保存配置和跑步数据
    saveConfig(config);
    saveRuns(runsData);
    
    return res.json({ success: true });
  }
  
  // 更新组别
  if (!runner || !group) {
    return res.status(400).json({ error: '人员和组别必填' });
  }
  
  const runnerObj = config.runners.find(r => r.name === runner);
  if (runnerObj) {
    runnerObj.group = group;
    saveConfig(config);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '人员不存在' });
  }
});

// API: 按组统计
app.get('/api/stats/by-group', (req, res) => {
  const { group } = req.query;
  const stats = getGroupStats();
  
  // 如果指定了组别，只返回该组
  if (group) {
    stats.groups = stats.groups.filter(g => g.group === group);
  }
  
  res.json(stats);
});

// API: 仪表盘数据
app.get('/api/dashboard', (req, res) => {
  const runs = loadRuns();
  const validRuns = runs.filter(r => r.isValid);
  const { runner, group } = req.query;
  
  // 获取组别对应的人员列表
  let groupRunners = [];
  if (group) {
    const config = getConfig();
    groupRunners = config.runners.filter(r => r.group === group).map(r => r.name);
  }
  
  let filteredRuns = runs;
  let filteredValid = validRuns;
  
  if (group && groupRunners.length > 0) {
    filteredRuns = runs.filter(r => groupRunners.includes(r.runner));
    filteredValid = validRuns.filter(r => groupRunners.includes(r.runner));
  }
  
  if (runner) {
    filteredRuns = filteredRuns.filter(r => r.runner === runner);
    filteredValid = filteredValid.filter(r => r.runner === runner);
  }
  
  const currentMonth = new Date().toISOString().substring(0, 7);
  const thisMonthRuns = filteredValid.filter(r => r.date.startsWith(currentMonth));
  const thisMonthDistance = thisMonthRuns.reduce((sum, r) => sum + (r.distance || 0), 0);
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);
  
  const thisWeekRuns = filteredValid.filter(r => new Date(r.date) >= monday);
  const thisWeekDistance = thisWeekRuns.reduce((sum, r) => sum + (r.distance || 0), 0);
  const totalCalories = filteredValid.reduce((sum, r) => sum + (r.calories || 0), 0);
  
  res.json({
    totalRuns: filteredRuns.length,
    validRuns: filteredValid.length,
    invalidRuns: filteredRuns.length - filteredValid.length,
    totalDistance: filteredValid.reduce((sum, r) => sum + (r.distance || 0), 0),
    totalCalories,
    thisMonthDistance,
    thisMonthRuns: thisMonthRuns.length,
    thisWeekDistance,
    thisWeekRuns: thisWeekRuns.length
  });
});

// API: 获取人员列表
app.get('/api/runners', (req, res) => {
  const runners = [
    '卓红波', '邹桂芳', '胡海民', '陈娟', '郑双',
    '赵妍', '唐碧芳', '王敏', '周宇', '苏道军', '吴政'
  ];
  res.json({ runners });
});

// 前端路由
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, '../frontend/upload.html')));
app.get('/stats', (req, res) => res.sendFile(path.join(__dirname, '../frontend/stats.html')));
app.get('/runners', (req, res) => res.sendFile(path.join(__dirname, '../frontend/runners.html')));
app.get('/details', (req, res) => res.sendFile(path.join(__dirname, '../frontend/details.html')));

// 获取本机 IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('🏃 跑步追踪器已启动!');
  console.log('📱 本地访问：http://localhost:' + PORT);
  console.log('📱 手机访问：http://' + ip + ':' + PORT);
  console.log('📊 数据文件：' + DATA_FILE);
});
