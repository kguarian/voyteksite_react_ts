import React from "react";
class Details extends React.Component {
  render() {
    return (
      <div>
        <h1>Instructions</h1>
        <p>You will be presented with plots of time series data.</p>
        <p>Please select the time interval where the signal shows oscillatory activity, if there is one.</p>
        <p>The signal may have no oscillatory activity, so you might not make a selection in a given signal.</p>
        <p> In this signal, we might select this interval:</p>
        <p>At the bottom of the page, please write your name and submit your response</p>
        <p>Thank you for your time!</p>
      </div>
    );
  }
}

export default Details;
