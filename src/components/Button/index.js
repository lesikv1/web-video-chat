import classes from './Button.module.css';
import axios from 'axios';

function Button() {

  const reqestLogin = async () => {

    // let res2 = await axios({
    //     method: 'get',
    //     url: 'https://jsonplaceholder.typicode.com/posts/1'
    // })
    //     return console.log(res2.data)
    let res = await axios.post('https://sales-assistant.my-dev.org/api/v1/auth/login',
      { email: 'user@gmail.com', password: 'password'}, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/vnd.api+json',
        },
    })

    console.log(res.data.data, 'reeeees')
};


  return (
    <div className={classes.button} onClick={reqestLogin}>
      <p>Button</p>
    </div>
  );
}

export default Button;
