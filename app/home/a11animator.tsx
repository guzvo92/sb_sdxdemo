"use client";
import React, { useState, useEffect } from "react";
import './a11animator.css';

// Animacion de terminal estilo retro. Tipea linea por linea y
// reinicia despues de 10s al terminar. Clonado de sb_satelldex.
export function Comp_TextAnimation() {
  const [visibleText, setVisibleText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const text = [
    "Test [Version 1.1]",
    "(c) Satellbyte Labs 2026.",
    "",
    "test_OS>  run whojeet()",
    "Uploading rpc connections ... ",
    "Loading hodlers ... ",
    "",
    "####     Bots deployed: X     #### ",
    "####      Users found: X      #### ",
    "####   Agents mode: Learning  #### ",
    "",
    "Data Scrapping in progress..."
  ];

  useEffect(function () {
    function addCharacter() {
      if (currentLineIndex < text.length) {
        const currentLine = text[currentLineIndex];
        if (currentCharIndex < currentLine.length) {
          setVisibleText(function (prev: any) {
            return prev + currentLine[currentCharIndex];
          });
          setCurrentCharIndex(function (prev: any) {
            return prev + 1;
          });
        } else {
          setVisibleText(function (prev: any) {
            return prev + "\n";
          });
          setCurrentCharIndex(0);
          setCurrentLineIndex(function (prev: any) {
            return prev + 1;
          });
        }
      }
    }

    const interval = setInterval(addCharacter, 40);

    if (currentLineIndex === text.length) {
      const resetTimeout = setTimeout(function () {
        setVisibleText("");
        setCurrentCharIndex(0);
        setCurrentLineIndex(0);
      }, 10000);

      return function cleanup() {
        clearInterval(interval);
        clearTimeout(resetTimeout);
      };
    }

    return function cleanup() {
      clearInterval(interval);
    };
  }, [currentCharIndex, currentLineIndex, text]);

  return (
    <>
      <div id="animator" className=" text-animation-container container-fluid">
        <div className="row">
          <div className="col-1"></div>
          <div id="sectioncmd" className="col-10 text-start">
            <pre className="mt-3 animated-text">{visibleText}</pre>
          </div>
          <div className="col-1"></div>
        </div>
      </div>
    </>
  );
}
