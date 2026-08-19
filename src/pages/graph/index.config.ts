export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '关系图谱' })
  : { navigationBarTitleText: '关系图谱' }
