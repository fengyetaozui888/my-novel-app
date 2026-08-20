export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '群聊', navigationStyle: 'custom' })
  : { navigationBarTitleText: '群聊', navigationStyle: 'custom' }
