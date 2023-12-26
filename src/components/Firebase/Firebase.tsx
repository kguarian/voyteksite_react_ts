/**
 * Author: Kenton Guarian and Ryan Hammonds
 * Date: 2023-12-26
 * Description: This file contains the FirebaseComponent class.
 * The FirebaseComponent class:
 *  1. displays the Details Component (The Instructions) as the first slide.
 *  2. displays the signals in order, for the next slides
 */

// TODO: check that the begin and end buttons have same style

import React from "react";
import "./Firebase.css";
import { initializeApp } from "firebase/app";
import "firebase/analytics";
import { get, getDatabase, ref, set } from "firebase/database";

import Plot from "react-plotly.js";
import { Button, Input } from "@mui/material";
import Details from "../Details/Details";

const initializeFirebase = () => {
  // Initialize Firebase
  // Firebase is this app's database host. We can manage the data shown to our labeling partners here
  const appreturn = initializeApp({
    apiKey: "AIzaSyDIy-XQqLfxP1zEsxwHzF8Y33ak4Pyr0A4",
    authDomain: "voyteklabstudy.firebaseapp.com",
    databaseURL: "https://voyteklabstudy-default-rtdb.firebaseio.com",
    projectId: "voyteklabstudy",
    storageBucket: "voyteklabstudy.appspot.com",
    messagingSenderId: "565549672209",
    appId: "1:565549672209:web:fcd188621ae303d0b08eb0",
    measurementId: "G-ZNQCNC99NZ",
  });
  // turn on if you want sensitive data to be printed to console.log
  // console.log(appreturn);
  // getAnalytics(appreturn);

  // Should print "[Default]" and allow us to use the appreturn variable
  console.log(appreturn.name);
};

interface MyState {
  name: string;
  x_selections: number[][];
  indices: number[];
  // This is a 4-tuple of lists: each element contains:
  // (
  //   (all_x, y_before_selection), <--Plot in black
  //   (all_x, y_inside_selection), <-- Plot in red
  //   (all_x, y_after_selection),  <-- Plot in black
  //   (all_x, all_y)               <-- Never changed, never plotted. Use this data as a parameter in the
  // )
  plot_data: any[];
  // This is a list of Plotly <Plot/> divs.
  plot_divs: JSX.Element[];
  // tells the program whether the plot data has been downloaded from firebase. Useful so we avoid invalid indexing errors with lists that are too short.
  plot_data_initialized: boolean[];
  // monitors the index of the plot (in a list of randomized plots) the site shows the labeller.
  current_plot_idx: number;
  // The number of signals the app will display (set by number of signals in Firebase storage in initializePage)
  sig_count: number;
  // The number of signals the app will display (set as const in initializePage)
  display_count: number;
  // monitors whether the `Submit` button at the end of the labelling task has been pressed
  submitted: boolean;
  // monitors whether the `Begin` button at the end of the labelling task has been pressed
  begun: boolean;
}

// Layout
const layout_params: any = {
  // causes Plot click-drag to generate a selection event
  dragmode: "select",
  // causes Plot click-drag to make horizontal selection
  selectdirection: "h",
  xaxis: {
    // causes Plot not to adjust x-axis window when a selection is made.
    fixedrange: true,
    // TODO: add x-axis time label (ms)

    // consider whether we want these false
    zeroline: false,
    showline: false,
  },

  yaxis: {
    // we don't want y-axis selections. This was a minor issue...
    fixedrange: true,
  },
  // we've decided we don't like the legend
  showlegend: false,
  //TODO: may need to adjust height and width with signal
  width: 1000,
  height: 150,

  // Remove (x,y) label on pointer
  hovermode: false,
  margin: {
    l: 25,
    r: 25,
    b: 25,
    t: 25,
    pad: 5,
  },
};

// This should be 50 when we have 50 signals. Now we have 48.
const sigsToShow = 9;
class FirebaseComponent extends React.Component {
  // this constructor sets the state and initializes the page
  // x_selections will be sent to the firebase rtdb server upon page completion,
  // Details (Instructions) and plot_data will be rendered on the page

  constructor(props: any) {
    super(props);
    this.state = {
      x_selections: [] as number[][],
      plot_data: [] as any[],
      plots_initialized: [] as boolean[],
      plot_divs: [] as JSX.Element[],
      current_plot_idx: 0 as number,
      sig_count: 0 as number,
      display_count: 0 as number,
      submitted: false as boolean,
      begun: false as boolean,
    };
    this.initializePage();
  }

  /* initializePage: no return value
    initializePage sets state variables. We call it in the constructor.
  */
  initializePage() {
    this.getSigCount().then((num_sigs) => {
      if (num_sigs < sigsToShow) {
        console.log("not enough sigs available");
        alert("not enough sigs available.");
        return;
      }
      // only set if there were enough signals in database to load the page as we'd like
      this.setState({ display_count: sigsToShow });

      if (num_sigs == 0) {
        console.log("no sigs available");
        alert("no sigs available.");
        return;
      }
      // replot: init plot_data_initialized to array of false.
      // getPlot and setPlot set values in this array to true.
      var plt_init = Array<boolean>(sigsToShow);
      for (let i = 0; i < sigsToShow; i++) {
        plt_init[i] = false;
      }
      this.setState({ plot_data_initialized: plt_init });

      // this will keep track selections of time intervals
      const x_selections: number[][] = [];
      // -1 is an invalid value for x0 and x1
      // so if we see a -1 in the rtdb, we know that the user
      // has not selected a burst range for that signal
      for (let i = 0; i < sigsToShow; i++) {
        x_selections.push([-1, -1]);
      }
      this.setState({
        x_selections: x_selections,
      });
      // choose random sigs to show
      const signalIndices = this.pickSigs(sigsToShow, num_sigs);
      // make the db refs for the sigs
      const signalDatabaseReferences = this.refsFromIndex(signalIndices);
      console.log(signalDatabaseReferences);
      // get data for the sigs
      const dataPromise = this.getSignals(signalDatabaseReferences);
      // with the data, make the plot_data
      dataPromise.then((data) => {
        //x_list is a list of lists of x-axes/time (one for each sig)
        const x_list = [];
        //y_list is a list of lists of y-axes/voltage time series (one for each sig)
        const y_list = [...data];
        // db check
        if (y_list.length != sigsToShow) {
          console.log("wrong number of sigs");
          return;
        }
        // make & store the x-axis for each sig
        for (let i = 0; i < y_list.length; i++) {
          x_list.push(this.linspace(0, y_list[i].length));
        }
        const plotly_burst: any[] = [];
        // Plotly <Plot/> components take a list of data elements
        // we plan to pass the before, burst, and after data elements
        // to the <Plot/> components. before and after will be plotted black
        // and burst will be plotted red.
        // Here we make the initial data elements.
        for (let i = 0; i < x_list.length; i++) {
          // updatePlot will update the before, burst, and after plot_data
          // so the before and after plot_data won't always be empty
          const data_elements_before = {
            x: [],
            y: [],
            type: "scatter",
            name: `sig_${i}`,
            marker: { color: "black" },
          };
          const data_elements_burst = {
            x: x_list[i],
            y: y_list[i],
            type: "scatter",
            name: `sig_${i}`,
            marker: { color: "red" },
          };
          const data_elements_after = {
            x: [],
            y: [],
            type: "scatter",
            name: `sig_${i}`,
            marker: { color: "black" },
          };
          const data_elements_alldata = {
            x: x_list[i],
            y: y_list[i],
            type: "scatter",
            name: `sig_${i}`,
            marker: { color: "red" },
          };

          // alldata allows us to make the selections without
          // having to concatenate the before, burst, and after data
          // elements's x and y props then slice them to get the new
          // selection
          plotly_burst.push([
            data_elements_before,
            data_elements_burst,
            data_elements_after,
            data_elements_alldata,
          ]);
        }
        this.setState({
          plot_data: plotly_burst,
        });
      });
    });
  }

  // Firebase db function. gets the number of sigs available
  // from the firebase rtdb server
  // ref returns a promise and is thus asynchronous
  async getSigCount(): Promise<number> {
    const dbref = ref(getDatabase(), "n_sigs");
    const snapshot = await get(dbref);
    if (snapshot.exists()) {
      console.log(snapshot.val());
      this.setState({ sig_count: snapshot.val() });
      return snapshot.val();
    } else {
      console.log("n_sig data unavailable from Firebase");
      return 0;
    }
  }

  // linspace returns equivalent of np.linspace(x0,x1,1) in python
  linspace(x0: number, x1: number): number[] {
    let new_x_burst: number[] = [];
    for (let i = x0; i < x1; i++) {
      new_x_burst.push(i);
    }
    return new_x_burst;
  }

  // masked_slice returns a copy of y, with the values outside the
  // half-open interval [x0,x1) masked with NaN's.
  masked_slice(y: number[], x0: number, x1: number): number[] {
    let padded_y: number[] = [];
    for (let i = 0; i < x0; i++) {
      padded_y.push(NaN);
    }
    for (let i = x0; i < x1; i++) {
      padded_y.push(y[i]);
    }
    for (let i = x1; i < y.length; i++) {
      padded_y.push(NaN);
    }
    return padded_y;
  }

  // pickSigs picks a random selection of sigs to show
  // it does not actually get the data for the sigs, but instead chooses indices
  pickSigs(sigs_to_show: number, total_sigs: number): number[] {
    let sig_idxs: number[] = [];
    // picking sigs to show
    for (let i = 0; i < sigs_to_show; ) {
      // https://www.w3schools.com/JS/js_random.asp
      let rand_int = Math.floor(Math.random() * total_sigs);
      if (sig_idxs.includes(rand_int)) {
        // find a new random integer because this one is taken
        continue;
      } else {
        // increment on this step because this is when we have a NEW random int
        sig_idxs.push(rand_int);
        i++;
      }
    }
    this.setState({
      indices: sig_idxs,
    });
    return sig_idxs;
  }

  // index -> `sig_${index}`
  refsFromIndex(sig_idxs: number[]): string[] {
    let sig_refs: string[] = [];
    for (let i = 0; i < sig_idxs.length; i++) {
      sig_refs.push(`sig_${sig_idxs[i]}`);
    }
    return sig_refs;
  }

  // get data for each sig from the firebase rtdb server
  async getSignals(sig_refs: string[]): Promise<number[][]> {
    console.log("running callback");
    // these will be the randomized collection of time series
    const values_object: number[][] = [];
    // promise_array will be a list of promises
    // that we will wait for to resolve.
    // When they resolve, we will have the data for each signal
    const promise_array = [];
    // get all json data promises for each sig and store them in promise_array
    for (let i = 0; i < sig_refs.length; i++) {
      const dbref = ref(getDatabase(), `sigs/${sig_refs[i]}`);
      promise_array.push(get(dbref));
    }
    // wait for all promises to resolve ("db get" to finish)
    const values_promise: Promise<number[][]> = Promise.all(promise_array).then(
      // use the db snapshot data to make the time series
      (snapshots) => {
        console.log(snapshots);
        for (let i = 0; i < snapshots.length; i++) {
          if (snapshots[i].exists()) {
            console.log(snapshots[i].val());
            values_object.push(snapshots[i].val() as number[]);
          } else {
            // TODO: handle this error better
            console.log(`snapshot ${i} unavailable`);
          }
        }
        console.log(values_object);
        return values_object;
      }
    );
    return values_promise;
  }

  // updatePlot uses data from a selection event to
  // update x_selections state varable and the plotly Plot
  updatePlot(index: number, x0: number, x1: number) {
    console.log(`updating plot ${index}`);
    const { plot_data, x_selections, plot_divs } = this.state as MyState;
    const plot_4_tuple = plot_data[index];
    // at any moment, the concatenated x_vals and y_vals have same length: the signal length
    const all_x_vals = plot_4_tuple[3].x;
    const all_y_vals = plot_4_tuple[3].y;

    const data_elements_before = {
      x: [...all_x_vals],
      y: this.masked_slice(all_y_vals, 0, x0 + 1),
      type: "scatter",
      name: `sig_${index}`,
      marker: { color: "black" },
    };
    const data_elements_burst = {
      x: [...all_x_vals],
      y: this.masked_slice(all_y_vals, x0, x1),
      type: "scatter",
      name: `sig_${index}`,
      marker: { color: "red" },
    };
    const data_elements_after = {
      x: [...all_x_vals],
      y: this.masked_slice(all_y_vals, x1 - 1, all_y_vals.length),
      type: "scatter",
      name: `sig_${index}`,
      marker: { color: "black" },
    };
    const new_plot_4_tuple = [
      data_elements_before,
      data_elements_burst,
      data_elements_after,
      // we don't need to update the alldata plot
      // it should never change
      plot_4_tuple[3],
    ];
    // update the plot_div with the new plot_4_tuple
    let plotly_plot_div = this.getPlot(index);
    if (plotly_plot_div == null) {
      console.log("plotly_plot_div is null");
      return false;
    }
    let divcopy = React.cloneElement(plotly_plot_div, {
      // yaxis: {range: [Math.min(...all_y_vals), Math.max(...all_y_vals)]},
      data: [new_plot_4_tuple[0], new_plot_4_tuple[1], new_plot_4_tuple[2]],
    });

    this.setPlot(index, divcopy);
    // only update plot[index].
    plot_data[index] = new_plot_4_tuple;
    x_selections[index] = [x0, x1];
    // layout_params.xaxis.rangeselector.range = [x0, x1];
    this.setState({
      x_selections: x_selections,
      plot_data: plot_data,
    });
  }
  isValidFirebasePath(path: string) {
    // Firebase paths must be UTF-8 encoded, non-empty strings and can't contain ".", ",", "$", "#", "[", "]", "/", or ASCII control characters 0-31 or 127
    if (typeof path !== "string" || path.length === 0 || path.length > 768) {
      console.log(
        "The attempted name was either empty, not a string, or too long."
      );
      return false;
    }

    // made from
    // https://stackoverflow.com/questions/66283513/how-do-i-enable-forbidden-characters-on-google-firebase#:~:text=Firebase%20keys%20in%20the%20Realtime%20Databse%20cannot%20contain,%2F%2C%20or%20ASCII%20control%20characters%200-31%20or%20127%26%5D.
    const invalidCharacters = [
      "@",
      ".",
      ",",
      "$",
      "#",
      "[",
      "]",
      "/",
      ...Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)),
      String.fromCharCode(127),
    ];

    // Check for invalid characters in string
    for (let i = 0; i < invalidCharacters.length; i++) {
      if (path.includes(invalidCharacters[i])) {
        console.log("The attempted name contained an invalid character.");
        return false;
      }
    }
    return true;
  }

  //beginButton returns the instructions for the task,
  // followed by a begin button
  beginButton() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Details />
        <Button
          className="input_fb"
          style={{ fontSize: "24px" }}
          onClick={() => {
            console.log("going to next signal");
            this.setState({ begun: true });
          }}
        >
          Begin
        </Button>
      </div>
    );
  }

  // returns horizontally aligned name and submit buttons
  submissionButtons() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <Input
            style={{ fontSize: "48px" }}
            className="input_fb"
            type="text"
            placeholder="Enter name"
            onChange={(event) => {
              const value = event.target.value;
              for (let i = 0; i < value.length; i++) {
                if (!this.isValidFirebasePath(value)) {
                  alert("invalid name for firebase");
                  return;
                }
              }
              this.setState({ name: event.target.value });
            }}
          />
          <Button
            style={{ fontSize: "48px" }}
            className="input_fb"
            onClick={() => {
              console.log("submitting selections");
              console.log(this.state);
              const { x_selections, name, indices } = this.state as MyState;
              const time_millis = Date.now().toString();
              console.log(x_selections);
              // submit the selections to the firebase rtdb server with a timestamp ensuring uniqueness and traceability
              set(ref(getDatabase(), `selections/${name}@${time_millis}`), {
                selections: x_selections,
                time_millis: time_millis,
                name: name,
                indices: indices,
              }).then(() => {
                console.log("selections submitted");
                this.setState({ submitted: true });
              });
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    );
  }

  // Message to thank labelers.
  postSubMessage() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
        className="input_fb"
      >
        Thank you for your participation!
      </div>
    );
  }

  // error message for when we have database issue
  noSigMessage() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
        className="input_fb"
      >
        There are no sigs to show
      </div>
    );
  }

  // different error message.
  undefinedNullMessage() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
        className="input_fb"
      >
        Undefined or null
      </div>
    );
  }

  // to enable plotly state copy of plots to keep selection box active
  getPlot(plot_idx: number) {
    const { display_count, plot_data_initialized, plot_data, plot_divs } = this
      .state as MyState;
    if (0 > plot_idx || plot_idx >= display_count) {
      return null;
    }
    if (plot_data_initialized[plot_idx]) {
      return plot_divs[plot_idx];
    }

    plot_data_initialized[plot_idx] = true;
    let plotData = plot_data[plot_idx];
    let plotly_plot_div = (
      <Plot
        key={plot_idx}
        data={[plotData[0], plotData[1], plotData[2]]}
        layout={JSON.parse(JSON.stringify(layout_params))}
        config={{
          scrollZoom: false,
          responsive: false,
          displayModeBar: false,
        }}
        onSliderChange={(e) => {
          console.log(e);
        }}
        onSelected={(e) => {
          console.log(`plot ${plot_idx} selected`);
          console.log(e);
          // console.log(e);
          if (e == undefined) {
            this.updatePlot(plot_idx, 0, plotData[3].x.length);
            return;
          }
          if (e.range == undefined) {
            return;
          }
          // the Plotly selection event returns non-integral floats
          const x0 = Math.floor(e.range.x[0]);
          const x1 = Math.floor(e.range.x[1]);
          if (x0 == undefined || x1 == undefined) {
            return;
          } else {
            console.log(x0, x1);
          }
          this.updatePlot(plot_idx, x0, x1);
          console.log(this.state);
        }}
      />
    );
    plot_divs[plot_idx] = plotly_plot_div;
    return plotly_plot_div;
  }

  // for prolonged selection box activation
  setPlot(plot_idx: number, plotly_plot_div: JSX.Element) {
    const { plot_divs } = this.state as MyState;
    plot_divs[plot_idx] = plotly_plot_div;
    this.setState({ plot_divs: plot_divs });
  }

  // Layout:
  // <div> : Named after component
  //  *List of plot_data*
  //  *input field* *submit button*
  // </div>
  render() {
    console.log("rendering");
    const {
      plot_data,
      current_plot_idx,
      sig_count,
      display_count,
      submitted,
      begun,
    } = this.state as MyState;

    console.log(`current idx: ${current_plot_idx}. Total: ${display_count}`);
    if (plot_data.length > 0) {
      if (!begun) {
        return this.beginButton();
      }
      if (current_plot_idx < display_count) {
        let plot = this.getPlot(current_plot_idx);
        if (plot == null || plot == undefined) {
          return this.undefinedNullMessage();
        }
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
              }}
            >
              <h1>Plot {current_plot_idx}</h1>
              <br />
              {plot}
              <br />
              <Button
                style={{ fontSize: "24px" }}
                className="input_fb"
                onClick={() => {
                  this.setState({ current_plot_idx: current_plot_idx + 1 });
                }}
              >
                Next Plot
              </Button>
            </div>
          </div>
        );
      } else if (sig_count == 0) {
        return this.noSigMessage();
      } else {
        if (submitted) {
          return this.postSubMessage();
        } else {
          return this.submissionButtons();
        }
      }
    } else {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
          className="FirebaseComponent"
        >
          Loading...
        </div>
      );
    }
  }
}

export { initializeFirebase, FirebaseComponent };
