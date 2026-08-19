export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '人设工坊' })
  : { navigationBarTitleText: '人设工坊' }
