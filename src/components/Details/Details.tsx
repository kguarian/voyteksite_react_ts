import React from "react";
class Details extends React.Component {
  render() {
    return (
      <div>
        <h1>Instructions</h1>
        <p>
          Once you select “Begin,” you will be presented with a plot of time
          series data.
        </p>
        <p>
          Please select the time interval where the signal shows oscillatory
          activity, if such an interval exists.
        </p>
        <p>
          The signal may have no oscillatory activity, so you might not select
          an interval in the presented signal. Once you have done so, please
          click “Next.”
        </p>
        <p>
          This will continue until you have labeled 9 signals.
        </p>
        <p>
          After that many signals, please write your name in the presented input
          box and press submit.
        </p>
      </div>
    );
  }
}

export default Details;
