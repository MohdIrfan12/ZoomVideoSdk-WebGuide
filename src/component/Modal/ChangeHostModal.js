import React, { Component } from "react";
import { modalService } from "../../Constant";
import List from "./List";
import "./Modal.css";

class Modals extends Component {
  state = {
    status: false,
    data: null,
  };

  componentDidMount() {
    console.log(this.props.userArray);
    this.modalSubscriber = modalService.getModalMessage().subscribe((res) => {
      // console.log(this.props.userArray);
      this.setState({
        data: res.data,
        status: res.status,
      });
    });
  }

  componentWillUnmount() {
    this.modalSubscriber.unsubscribe();
  }

  render() {
    const status = (
      <div className="Backdrop zIndex">
        <div className="historyModals">
          <div className="modal_div">
            <div className="DivContainer">
              <button onClick={this.props.hidePopup} className="closePopup">
                close
              </button>
              {this.props.userArray.map((User, index) => {
                return (
                  <div
                    onClick={() => {
                      this.props.changeHost(User);
                    }}
                    key={index}>
                    <List key={index} name={User.displayName} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
    return <React.Fragment>{status}</React.Fragment>;
  }
}

export const ClosePopup = () => {
  modalService.sendModalMessage({ status: false, data: null });
};

export const OpenPopup = (data, showCross = true) => {
  console.log("OpenPopup");
  modalService.sendModalMessage({ status: true, data: data });
};

export default Modals;
