import React, { FC, useRef, useEffect, useState } from "react";
import "./Firebase.css";
import { initializeApp } from "firebase/app";
import "firebase/analytics";
import { DataSnapshot, get, getDatabase, ref } from "firebase/database";
import Plot from "react-plotly.js";
import Plotly from "plotly.js";
import { data } from "jquery";

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

class FirebaseComponent extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      plots: [],
    };
    this.getSigCount();
    console.log(this.state);
  }

  initializePage() {
    let sigs, users;
    let sig_refs: string[] = [];
    let test_sigs: number = 2;
    this.getSigCount().then((num_sigs) => {
      console.log(num_sigs);
      if (num_sigs == 0) {
        console.log("no sigs available");
        return;
      }
      const sig_idxs = this.pick_sigs(test_sigs, num_sigs);
      const sig_refs = this.refs_from_idxs(sig_idxs);
      console.log(sig_refs);
      this.getSigs(sig_refs);
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
      console.log("No data available");
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

  make_corr_y_burst(x0: number, x1: number, y: number[]): number[] {
    let new_y_burst: number[] = [];
    for (let i = x0; i < x1; i++) {
      new_y_burst.push(y[i]);
    }
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

  async getSigs(sig_refs: string[]) {
    console.log("running callback");
    const values: DataSnapshot[] = [];
    // get all json data for each sig
    const promise_array = [];
    for (let i = 0; i < sig_refs.length; i++) {
      const dbref = ref(getDatabase(), sig_refs[i]);
      promise_array.push(get(dbref));
    }
    Promise.all(promise_array).then((snapshots) => {
      console.log(snapshots);
      for (let i = 0; i < snapshots.length; i++) {
        if (snapshots[i].exists()) {
          console.log(snapshots[i].val());
          values.push(snapshots[i].val());
        } else {
          console.log("No data available");
        }
      }
      console.log(values);
      return values;
    });
  }

  render() {
    return <div className="FirebaseComponent">nothing to show</div>;
  }
}

export { initializeFirebase, FirebaseComponent };
