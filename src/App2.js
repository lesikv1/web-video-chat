import React, { useState } from 'react';

export default function App () {
  const [count, setCount] = useState({
    name: 'lesik',
    age: 0
  });

  console.log(count, 'count --- - -')

  return (
    <div>
      <button onClick={() => setCount(prevState => {
        prevState.age += 1

        return {
          ...prevState
        }
      })}>
        lesik
      </button>
      <h1>{count.age}</h1>
    </div>
  )
}


