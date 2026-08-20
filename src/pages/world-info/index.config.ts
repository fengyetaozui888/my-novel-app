export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '世界信息' })
  : { navigationBarTitleText: '世界信息' };
