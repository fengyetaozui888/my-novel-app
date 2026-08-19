export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '使用说明' })
  : { navigationBarTitleText: '使用说明' }
