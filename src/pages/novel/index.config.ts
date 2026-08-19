export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '角色管理',
      navigationBarBackgroundColor: '#f8f5f2',
      navigationBarTextStyle: 'black',
    })
  : {
      navigationBarTitleText: '角色管理',
      navigationBarBackgroundColor: '#f8f5f2',
      navigationBarTextStyle: 'black',
    }
