export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '发起群聊', navigationStyle: 'custom' })
  : { navigationBarTitleText: '发起群聊', navigationStyle: 'custom' }
