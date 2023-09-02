import React, { FC, useRef, useEffect, useState } from "react";
import "./Firebase.css";
import { initializeApp } from "firebase/app";
import "firebase/analytics";
import { DataSnapshot, get, getDatabase, ref, set } from "firebase/database";
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
  constructor(props: any) {
    super(props);
    this.state = {
      x_selections: [] as number[][],
      plots: [] as any[],
    };
    this.initializePage();
  }

  initializePage() {
    let sigs, users;
    let sig_refs: string[] = [];
    let test_sigs: number = 9;
    this.getSigCount().then((num_sigs) => {
      console.log(num_sigs);
      const new_x_selections: number[][] = [];
      for (let i = 0; i < test_sigs; i++) {
        new_x_selections.push([-1, -1]);
      }
      this.setState({
        x_selections: new_x_selections,
      });
      if (num_sigs == 0) {
        console.log("no sigs available");
        return;
      }
      const sig_idxs = this.pick_sigs(test_sigs, num_sigs);
      const sig_refs = this.refs_from_idxs(sig_idxs);
      console.log(sig_refs);
      const dataPromise = this.getSigs(sig_refs);
      dataPromise.then((data) => {
        const x_list = [];
        const y_list = [...data];

        if (y_list.length != test_sigs) {
          console.log("wrong number of sigs");
          return;
        }
        for (let i = 0; i < y_list.length; i++) {
          x_list.push(this.make_new_x_burst(0, y_list[i].length));
        }
        console.log(x_list);
        console.log(y_list);
        const plots: any[] = [];
        const plotly_burst: any[] = [];
        for (let i = 0; i < x_list.length; i++) {
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
  async getSigCount(): Promise<number> {
    const dbref = ref(getDatabase(), "n_sigs");
    const snapshot = await get(dbref);
    let val = 0;
    if (snapshot.exists()) {
      console.log(snapshot.val());
      const num_sigs = snapshot.val();
      return snapshot.val();
    } else {
      console.log("n_sig data unavailable from firebase");
      return 0;
    }
  }

  make_new_x_burst(x0: number, x1: number): number[] {
    let new_x_burst: number[] = [];
    for (let i = x0; i < x1; i++) {
      new_x_burst.push(i);
    }
    return new_x_burst;
  }

  make_padded_slice_y(y: number[], x0: number, x1: number): number[] {
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

  make_corr_y_burst(x0: number, x1: number, y: number[]): number[] {
    let new_y_burst: number[] = [];
    for (let i = 0; i < x0; i++) {
      new_y_burst.push(NaN);
    }
    for (let i = x0; i < x1; i++) {
      if (y[i] == undefined) {
        console.log(`y[${i}] is undefined`);
        continue;
      }
      new_y_burst.push(y[i]);
    }
    for (let i = x1; i < y.length; i++) {
      new_y_burst.push(NaN);
    }
    console.log(new_y_burst);
    return new_y_burst;
  }

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

  refs_from_idxs(sig_idxs: number[]): string[] {
    let sig_refs: string[] = [];
    for (let i = 0; i < sig_idxs.length; i++) {
      sig_refs.push(`sig_${sig_idxs[i]}`);
    }
    return sig_refs;
  }

  async getSigs(sig_refs: string[]): Promise<number[][]> {
    console.log("running callback");
    const values: number[][] = [];
    // get all json data for each sig
    const promise_array = [];
    for (let i = 0; i < sig_refs.length; i++) {
      const dbref = ref(getDatabase(), `sigs/${sig_refs[i]}`);
      promise_array.push(get(dbref));
    }
    const values2: Promise<number[][]> = Promise.all(promise_array).then(
      (snapshots) => {
        console.log(snapshots);
        for (let i = 0; i < snapshots.length; i++) {
          if (snapshots[i].exists()) {
            console.log(snapshots[i].val());
            values.push(snapshots[i].val() as number[]);
          } else {
            console.log(`snapshot ${i} unavailable`);
          }
        }
        console.log(values);
        return values;
      }
    );
    return values2;
  }

  // Let n=x.length
  // new_x_before=[0,1,2,...,x0-1]
  // new_x_burst=[x0,x0+1,...,x1-1]
  // new_x_after=[x1,x1+1,...,n-1]
  updatePlot(index: number, x0: number, x1: number) {
    console.log(`updating plot ${index}`);
    const { plots, x_selections } = this.state as myState;
    const plot_4_tuple = plots[index];
    // at any moment, the concatenated x_vals and y_vals have same length: the signal length
    const all_x_vals = plot_4_tuple[3].x;
    const all_y_vals = plot_4_tuple[3].y;

    const data_elements_before = {
      x: [...all_x_vals],
      y: this.make_padded_slice_y(all_y_vals, 0, x0),
      type: "scatter",
      name: `sig_${index}`,
      marker: { color: "black" },
    };
    const data_elements_burst = {
      x: [...all_x_vals],
      y: this.make_corr_y_burst(x0, x1, all_y_vals),
      type: "scatter",
      name: `sig_${index}`,
      marker: { color: "red" },
    };
    const data_elements_after = {
      x: [...all_x_vals],
      y: this.make_padded_slice_y(all_y_vals, x1, all_y_vals.length),
      type: "scatter",
      name: `sig_${index}`,
      marker: { color: "black" },
    };
    const new_plot_4_tuple = [
      data_elements_before,
      data_elements_burst,
      data_elements_after,
      plot_4_tuple[3],
    ];
    plots[index] = new_plot_4_tuple;
    x_selections[index] = [x0, x1];
    this.setState({
      x_selections: x_selections,
      plots: plots,
    });
  }

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
                  // console.log(data)
                  const x0 = Math.floor(e.range.x[0]);
                  const x1 = Math.floor(e.range.x[1]);
                  // console.log(x0);
                  // console.log(x1);
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
                if (value[i] == "@") {
                  alert("No spaces allowed in name");
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