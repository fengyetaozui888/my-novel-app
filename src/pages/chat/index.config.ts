export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '聊天',
      navigationBarBackgroundColor: '#f8f5f2',
      navigationBarTextStyle: 'black',
    })
  : {
      navigationBarTitleText: '聊天',
      navigationBarBackgroundColor: '#f8f5f2',
      navigationBarTextStyle: 'black',
    }
