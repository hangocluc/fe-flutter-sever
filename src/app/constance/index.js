module.exports.adminEmail = process.env.SMTP_USER || process.env.GMAIL_USER || ''
module.exports.adminPassword = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || ''
module.exports.mailHost = process.env.SMTP_HOST || 'smtp.gmail.com'
module.exports.mailPort = Number(process.env.SMTP_PORT || 587)
module.exports.topic = '/topics/all';
module.exports.text = 'Cảm ơn bạn đã gửi báo cáo cho chúng tôi ';
module.exports.title = 'Gửi bạn ';
module.exports.auto = `<h4 style="color: #2d4373;font-family: 'Candara'" class="text-primary m-0 font-weight-bold">Cám ơn bạn đã gửi thư góp ý  ,chúng tôi sẽ kiểm tra và gửi lại thông báo cho bạn sau . Một lần nữa xin chân thành cảm ơn và chúc bạn một ngày mới tốt lành</h4>
`;
module.exports.autoMess = `
<style>
h3:{
color: #0527fa;
}
</style>
    <h2 style="color: #2d4373;font-family: 'Candara'; text-align: center;">Flutter Server</h2>
    <h3 style="color: #2d4373;font-family: 'Candara'">Thank You & Best Regards.</h3>
        <p> ----------------------------------</p>
    <ul>  
      <li style="font-size: larger; color: #f34626;font-style: italic; font-family: 'Candara'">Admin: Nguyen Hai Dang</li>
      <li style="color: #055ada">Company: Flutter Server</li>
      <li style="color: #055ada">Email: dragonfly.javalab@gmail.com</li>
      <li style="color: #055ada">Phone: 0359424773</li>
      <li style="color: #055ada">Address: 1th floor,No.5 Trinh Van Bo,Xuan Phuong ,Nam Tu Liem, Ha Noi, Viet Nam</li>
    </ul>
`;
module.exports.contact = `
<style>
h3:{
color: #0527fa;
}
</style>
    <h3 style="color: #2d4373;font-family: 'Candara'">Thank You & Best Regards.</h3>
        <p> ----------------------------------</p>
    <ul>  
      <li style="font-size: larger; color: #f34626">Admin: Nguyen Hai Dang</li>
      <li style="color: #055ada">Company: Flutter Server</li>
      <li style="color: #055ada">Email: dragonfly.javalab@gmail.com</li>
      <li style="color: #055ada">Phone: 0359424773</li>
      <li style="color: #055ada">Address: 1th floor,No.5 Trinh Van Bo,Xuan Phuong ,Nam Tu Liem, Ha Noi, Viet Nam</li>
    </ul>
`;
