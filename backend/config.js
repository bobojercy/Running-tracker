const fs = require('fs');
const path = require('path');

// 数据文件路径
const DATA_FILE = path.join(__dirname, '../data/runs.json');
const CONFIG_FILE = path.join(__dirname, '../data/config.json');

// 预置人员配置
const defaultConfig = {
  runners: [
    { name: '卓红波', group: '第六组' },
    { name: '邹桂芳', group: '第六组' },
    { name: '胡海民', group: '第六组' },
    { name: '陈娟', group: '第六组' },
    { name: '郑双', group: '第六组' },
    { name: '赵妍', group: '第六组' },
    { name: '唐碧芳', group: '第六组' },
    { name: '王敏', group: '第六组' },
    { name: '周宇', group: '第六组' },
    { name: '苏道军', group: '第六组' },
    { name: '吴政', group: '第六组' }
  ],
  groups: ['第一组', '第二组', '第三组', '第四组', '第五组', '第六组']
};

// 初始化配置文件
function initConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
    console.log('✅ 创建配置文件');
    return defaultConfig;
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  
  // 确保所有组别存在
  defaultConfig.groups.forEach(g => {
    if (!config.groups.includes(g)) {
      config.groups.push(g);
    }
  });
  
  // 确保所有人员存在
  defaultConfig.runners.forEach(defaultRunner => {
    const existing = config.runners.find(r => r.name === defaultRunner.name);
    if (!existing) {
      config.runners.push(defaultRunner);
    } else if (!existing.group) {
      existing.group = '第六组';
    }
  });
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

// 获取配置
function getConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return initConfig();
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

// 保存配置
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// 更新人员组别
function updateRunnerGroup(runnerName, group) {
  const config = getConfig();
  const runner = config.runners.find(r => r.name === runnerName);
  if (runner) {
    runner.group = group;
    saveConfig(config);
    return true;
  }
  return false;
}

// 删除人员
function deleteRunner(runnerName) {
  const config = getConfig();
  const runnerIndex = config.runners.findIndex(r => r.name === runnerName);
  if (runnerIndex === -1) {
    return { success: false, error: '人员不存在' };
  }

  // 检查该人员是否有跑步记录
  const runsFile = path.join(__dirname, '../data/runs.json');
  if (fs.existsSync(runsFile)) {
    const runsData = JSON.parse(fs.readFileSync(runsFile, 'utf8'));
    const runnerRuns = runsData.runs?.filter(r => r.runner === runnerName) || [];
    if (runnerRuns.length > 0) {
      return {
        success: false,
        error: `该人员还有 ${runnerRuns.length} 条跑步记录，请先删除相关记录`
      };
    }
  }

  config.runners.splice(runnerIndex, 1);
  saveConfig(config);
  return { success: true };
}

// 新增组别
function addGroup(groupName) {
  const config = getConfig();
  if (config.groups.includes(groupName)) {
    return { success: false, error: '该组别已存在' };
  }
  config.groups.push(groupName);
  saveConfig(config);
  return { success: true };
}

// 修改组别名称
function updateGroup(oldName, newName) {
  const config = getConfig();

  if (!config.groups.includes(oldName)) {
    return { success: false, error: '原组别不存在' };
  }

  if (config.groups.includes(newName) && oldName !== newName) {
    return { success: false, error: '新组别名称已存在' };
  }

  // 更新组别列表
  const index = config.groups.indexOf(oldName);
  config.groups[index] = newName;

  // 更新所有该组别下的人员
  config.runners.forEach(runner => {
    if (runner.group === oldName) {
      runner.group = newName;
    }
  });

  saveConfig(config);
  return { success: true };
}

// 删除组别
function deleteGroup(groupName) {
  const config = getConfig();

  if (!config.groups.includes(groupName)) {
    return { success: false, error: '组别不存在' };
  }

  // 检查是否还有人员在该组别
  const runnersInGroup = config.runners.filter(r => r.group === groupName);
  if (runnersInGroup.length > 0) {
    return {
      success: false,
      error: `该组别下还有 ${runnersInGroup.length} 名人员，请先将他们调到其他组别`
    };
  }

  config.groups = config.groups.filter(g => g !== groupName);
  saveConfig(config);
  return { success: true };
}

// 按组统计
function getGroupStats() {
  const config = getConfig();
  
  // 读取跑步数据
  if (!fs.existsSync(DATA_FILE)) {
    return { groups: [] };
  }
  
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const runs = data.runs || [];
  const validRuns = runs.filter(r => r.isValid);
  
  // 按组统计
  const groupStats = {};
  config.groups.forEach(g => {
    groupStats[g] = {
      group: g,
      runners: [],
      totalDistance: 0,
      totalRuns: 0,
      totalCalories: 0
    };
  });
  
  // 统计每个人员的数据
  config.runners.forEach(runner => {
    const runnerRuns = validRuns.filter(r => r.runner === runner.name);
    const distance = runnerRuns.reduce((sum, r) => sum + (r.distance || 0), 0);
    const calories = runnerRuns.reduce((sum, r) => sum + (r.calories || 0), 0);
    
    const group = runner.group || '第六组';
    if (!groupStats[group]) {
      groupStats[group] = {
        group,
        runners: [],
        totalDistance: 0,
        totalRuns: 0,
        totalCalories: 0
      };
    }
    
    groupStats[group].runners.push({
      name: runner.name,
      group: group,
      distance: distance,
      runs: runnerRuns.length,
      calories: calories
    });
    
    groupStats[group].totalDistance += distance;
    groupStats[group].totalRuns += runnerRuns.length;
    groupStats[group].totalCalories += calories;
  });
  
  // 转换为数组并排序
  const groups = Object.values(groupStats)
    .filter(g => g.totalRuns > 0)
    .sort((a, b) => b.totalDistance - a.totalDistance);
  
  return { groups };
}

// 主函数
function main() {
  console.log('🏃 初始化人员配置...\n');
  
  const config = initConfig();
  
  console.log('✅ 人员配置:');
  config.runners.forEach(r => {
    console.log(`  ${r.name}: ${r.group}`);
  });
  
  console.log('\n✅ 组别列表:', config.groups.join(', '));
  
  const stats = getGroupStats();
  console.log('\n📊 组别统计:');
  stats.groups.forEach(g => {
    console.log(`  ${g.group}: ${g.totalRuns}次 / ${g.totalDistance.toFixed(2)}km / ${g.totalCalories}卡`);
  });
}

main();

module.exports = {
  getConfig,
  saveConfig,
  updateRunnerGroup,
  getGroupStats,
  initConfig,
  addGroup,
  updateGroup,
  deleteGroup,
  deleteRunner
};
