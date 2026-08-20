export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/novel/index',
    'pages/chat/index',
    'pages/profile/index',
    'pages/graph/index',
    'pages/interact/index',
    'pages/moments/index',
    'pages/affinity-book/index',
    'pages/agent-feedback/index',
    'pages/help/index',
    'pages/cafe/index',
    'pages/help-ask/index',
    'pages/group-create/index',
    'pages/group-chat/index',
    'pages/world-news/index',
    'pages/world-info/index',
    'pages/moments-detail/index',
    'pages/memories/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f8f5f2',
    navigationBarTitleText: '人设工坊',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#ec4899',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/tabbar/house.png',
        selectedIconPath: './assets/tabbar/house-active.png',
      },
      {
        pagePath: 'pages/moments/index',
        text: '朋友圈',
        iconPath: './assets/tabbar/sparkles.png',
        selectedIconPath: './assets/tabbar/sparkles-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/tabbar/user.png',
        selectedIconPath: './assets/tabbar/user-active.png',
      }
    ]
  }
})
