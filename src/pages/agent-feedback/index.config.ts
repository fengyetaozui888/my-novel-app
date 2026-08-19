export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: 'agent反馈' })
  : { navigationBarTitleText: 'agent反馈' }
