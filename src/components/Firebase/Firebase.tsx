/**
 * Author: Kenton Guarian
 * Date: 2023-09-02
 * Description: This file contains the FirebaseComponent class.
 * The FirebaseComponent class is a React component that renders
 * a list of Plotly <Plot/> components. The data for the plots
 * is retrieved from the firebase Realtime Database (rtdb) server. The user can
 * select a range of data in a plot and submit the selection
 * to the rtdb server in this component.
 */

import React from "react";
import "./Firebase.css";
import { initializeApp } from "firebase/app";
import "firebase/analytics";
import { get, getDatabase, ref, set } from "firebase/database";
import Plot from "react-plotly.js";

const initializeFirebase = () => {
  // Initialize Firebase
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
  console.log(appreturn);
  // getAnalytics(appreturn);
};

interface myState {
  name: string;
  x_selections: number[][];
  plots: any[];
}
const layout_params: any = {
  // Layout
  dragmode: "select",
  selectdirection: "h",
  xaxis: { zeroline: false },
  showlegend: true,
  width: 1000,
  height: 150,
  margin: {
    l: 25,
    r: 25,
    b: 25,
    t: 25,
    pad: 5,
  },
};

class FirebaseComponent extends React.Component {
  // this constructor wants to set the state and initialize the page
  // x_selections will be sent to the firebase rtdb server
  // and plots will be rendered on the page
  constructor(props: any) {
    super(props);
    this.state = {
      x_selections: [] as number[][],
      plots: [] as any[],
    };
    this.initializePage();
  }
  // initializePage gets the number of sigs available
  // (partly to make sure the db server is up, running, and reachable).
  // Then it gets a random selection of sigs to show, gets the data for them, and sets the state.
  // initializePage sets the state with lists of lists of data props for Plotly <Plot/> components.
  // render() renders the <Plot/> components.

  initializePage() {
    const test_sigs: number = 9;
    this.getSigCount().then((num_sigs) => {
      if (num_sigs < test_sigs) {
        console.log("not enough sigs available");
        alert(
          "not enough sigs available. " +
            "This means we couldn't get the" +
            "number of sigs from the firebase " +
            "server or there are not enough sigs in the database."
        );
        return;
      }

      // This is the list we'll use to initialize the state
      const x_selections: number[][] = [];
      // -1 is an invalid value for x0 and x1
      // so if we see a -1 in the rtdb, we know that the user
      // has not selected a burst range for that signal
      for (let i = 0; i < test_sigs; i++) {
        x_selections.push([-1, -1]);
      }
      this.setState({
        x_selections: x_selections,
      });
      if (num_sigs == 0) {
        console.log("no sigs available");
        alert("no sigs available.");
        return;
      }
      // choose random sigs to show
      const sig_idxs = this.pick_sigs(test_sigs, num_sigs);
      // make the db refs for the sigs
      const sig_refs = this.refs_from_idxs(sig_idxs);
      console.log(sig_refs);
      // get data for the sigs
      const dataPromise = this.getSigs(sig_refs);
      // with the data, make the plots:
      dataPromise.then((data) => {
        //x_list is a list of lists of x-axes/time (one for each sig)
        const x_list = [];
        //y_list is a list of lists of y-axes/voltage time series (one for each sig)
        const y_list = [...data];
        // db check
        if (y_list.length != test_sigs) {
          console.log("wrong number of sigs");
          return;
        }
        // make & store the x-axis for each sig
        for (let i = 0; i < y_list.length; i++) {
          x_list.push(this.new_timeseries_from_intervalas(0, y_list[i].length));
        }
        const plotly_burst: any[] = [];
        // Plotly <Plot/> components take a list of data elements
        // we plan to pass the before, burst, and after data elements
        // to the <Plot/> components. before and after will be plotted black
        // and burst will be plotted red.
        for (let i = 0; i < x_list.length; i++) {
          // updatePlot will update the before, burst, and after plots
          // so the before and after plots won't always be empty
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
        console.log(plotly_burst.length);
        this.setState({
          plots: plotly_burst,
        });
      });
    });
  }
  // db function. gets the number of sigs available
  // from the firebase rtdb server
  // ref returns a promise and is thus asynchronous
  async getSigCount(): Promise<number> {
    const dbref = ref(getDatabase(), "n_sigs");
    const snapshot = await get(dbref);
    if (snapshot.exists()) {
      console.log(snapshot.val());
      return snapshot.val();
    } else {
      console.log("n_sig data unavailable from firebase");
      return 0;
    }
  }

  // make_new_x_burst makes a list of time points for a signal.
  // it assumes that the signal is indexed by integers.
  // x0 is the start of the burst range
  // x1 is the integer above the end of the burst range
  new_timeseries_from_intervalas(x0: number, x1: number): number[] {
    let new_x_burst: number[] = [];
    for (let i = x0; i < x1; i++) {
      new_x_burst.push(i);
    }
    return new_x_burst;
  }

  // new_y_slice makes a list of y-axes/voltage for a signal
  // it assumes that the signal is indexed by integers.
  new_y_slice(y: number[], x0: number, x1: number): number[] {
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

  // pick_sigs picks a random selection of sigs to show
  // it does not actually get the data for the sigs
  pick_sigs(sigs_to_show: number, total_sigs: number): number[] {
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
    return sig_idxs;
  }

  // index -> `sig_${index}`
  refs_from_idxs(sig_idxs: number[]): string[] {
    let sig_refs: string[] = [];
    for (let i = 0; i < sig_idxs.length; i++) {
      sig_refs.push(`sig_${sig_idxs[i]}`);
    }
    return sig_refs;
  }

  // get data for each sig from the firebase rtdb server
  async getSigs(sig_refs: string[]): Promise<number[][]> {
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

  // Let n=x.length
  // new_x_before=[0,1,2,...,x0-1]
  // new_x_burst=[x0,x0+1,...,x1-1]
  // new_x_after=[x1,x1+1,...,n-1]
  // then the values of new_y_* variables are
  // new_y_before=[NaN,...,NaN,y[0],...,y[1]-1,NaN,...,NaN]
  updatePlot(index: number, x0: number, x1: number) {
    console.log(`updating plot ${index}`);
    const { plots, x_selections } = this.state as myState;
    const plot_4_tuple = plots[index];
    // at any moment, the concatenated x_vals and y_vals have same length: the signal length
    const all_x_vals = plot_4_tuple[3].x;
    const all_y_vals = plot_4_tuple[3].y;

    const data_elements_before = {
      x: [...all_x_vals],
      y: this.new_y_slice(all_y_vals, 0, x0),
      type: "scatter",
      name: `sig_${index}`,
      marker: { color: "black" },
    };
    const data_elements_burst = {
      x: [...all_x_vals],
      y: this.new_y_slice(all_y_vals, x0, x1),
      type: "scatter",
      name: `sig_${index}`,
      marker: { color: "red" },
    };
    const data_elements_after = {
      x: [...all_x_vals],
      y: this.new_y_slice(all_y_vals, x1, all_y_vals.length),
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
    // only update plot[index].
    plots[index] = new_plot_4_tuple;
    x_selections[index] = [x0, x1];
    this.setState({
      x_selections: x_selections,
      plots: plots,
    });
  }
  isValidFirebasePath(path: string) {
    // Firebase paths must be UTF-8 encoded, non-empty strings and can't contain ".", ",", "$", "#", "[", "]", "/", or ASCII control characters 0-31 or 127
    if (typeof path !== "string" || path.length === 0 || path.length > 768) {
      return false;
    }
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
    for (let i = 0; i < invalidCharacters.length; i++) {
      if (path.includes(invalidCharacters[i])) {
        return false;
      }
    }
    return true;
  }

  // Layout:
  // <div> : Named after component
  //  *List of Plots*
  //  *input field* *submit button*
  // </div>
  render() {
    const { plots } = this.state as myState;
    if (plots.length > 0) {
      return (
        <div className="FirebaseComponent">
          {plots.map((plotData, i) => (
            <div>
              <Plot
                key={i}
                data={[plotData[0], plotData[1], plotData[2]]}
                layout={JSON.parse(JSON.stringify(layout_params))}
                onSelected={(e) => {
                  console.log(`plot ${i} selected`);
                  // console.log(e);
                  if (e == undefined) {
                    this.updatePlot(i, 0, plotData[3].x.length);
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
                  }
                  this.updatePlot(i, x0, x1);
                  console.log(this.state);
                }}
              />
            </div>
          ))}
          <input
            type="text"
            placeholder="Enter name"
            onChange={(event) => {
              const value = event.target.value;
              for (let i = 0; i < value.length; i++) {
                if (!this.isValidFirebasePath(value)) {
                  alert("No spaces, slashes, or @'s allowed in name");
                  return;
                }
              }
              this.setState({ name: event.target.value });
            }}
          />
          <button
            onClick={() => {
              console.log("submitting selections");
              console.log(this.state);
              const { x_selections, name } = this.state as myState;
              const time_millis = Date.now().toString();
              console.log(x_selections);
              // submit the selections to the firebase rtdb server with a timestamp ensuring uniqueness and traceability
              set(ref(getDatabase(), `selections/${name}@${time_millis}`), {
                selections: x_selections,
                time_millis: time_millis,
                name: name,
              }).then(() => {
                console.log("selections submitted");
              });
            }}
          >
            Submit
          </button>
        </div>
      );
    } else {
      return <div className="FirebaseComponent">Loading...</div>;
    }
  }
}

export { initializeFirebase, FirebaseComponent };
