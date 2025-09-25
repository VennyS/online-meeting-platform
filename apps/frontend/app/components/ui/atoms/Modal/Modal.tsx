import React from "react";
import { ModalProps } from "./types";
import styles from "./Modal.module.css";

const Modal = ({ children, onClose }: ModalProps) => {
  return (
    <div className={styles.background} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default Modal;
