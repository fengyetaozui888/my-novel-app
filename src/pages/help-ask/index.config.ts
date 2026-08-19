export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '问问 Agent' })
  : { navigationBarTitleText: '问问 Agent' }
