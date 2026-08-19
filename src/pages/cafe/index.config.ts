export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '时空咖啡厅',
      navigationBarBackgroundColor: '#fdf2f8',
      navigationBarTextStyle: 'black',
    })
  : {
      navigationBarTitleText: '时空咖啡厅',
      navigationBarBackgroundColor: '#fdf2f8',
      navigationBarTextStyle: 'black',
    }
