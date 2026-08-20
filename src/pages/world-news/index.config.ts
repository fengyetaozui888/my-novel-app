export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '世界讯息' })
  : { navigationBarTitleText: '世界讯息' }
