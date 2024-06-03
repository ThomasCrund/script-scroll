const PDFExtract = require('pdf.js-extract').PDFExtract;
const fs = require('fs');
const pdfExtract = new PDFExtract();
const options = {}; /* see below */
pdfExtract.extract('../../client/public/sample.pdf', options, (err, data) => {
  if (err) return console.log(err);

  const output = {
    numPages: data.pages.length,
    pages: [],
    acts: []
  }


  let actNumber = 0
  let sceneNumber = 0
  let act = undefined
  let scene = undefined
  let actStarted = false
  let finished = false;
  for (const page of data.pages) {
    // console.log(page)
    pageOutput = {
      // "firstElement": {
      //   "str": page.content[0].str,
      //   "position": page.content[0].y,
      // },
      "elements": []
    }

    // if (page.pageInfo.num > 20) {
    //   return;
    // }

    for (const contentIndex of page.content.keys()) {
      // console.log(page.pageInfo.num, "act:", actNumber, ", scene:", sceneNumber);
      const content = page.content[contentIndex]
      if (content.str === "ACT") {
        if (actStarted) {
          actStarted = false;
          continue;
        }
        actStarted = true;
        // console.log("act", page.pageInfo.num, content)
        actNumber++;
        sceneNumber = 0;
        console.log("act", actNumber);
        if (scene != undefined) {
          act.scenes.push(scene);
          scene = undefined;
        }
        if (act != undefined) {
          output.acts.push(act);
          act = undefined;
        }
        act = {
          "actNumber": actNumber,
          "startPosition": (page.pageInfo.num - 1) + content.y / page.pageInfo.height,
          "scenes": []
        }
      }
      if (actNumber != 0) {
        if (content.str.includes("VOCAL")) {
          console.log("AT VOCALBOOK", page.pageInfo.num - 1)
          finished = true;
          break;
        }
        if (content.str.includes("SCENE")) {
          if (isNaN(parseInt(page.content[contentIndex + 2].str))) {
            console.log("ignore scene");
            continue;
          }
          if (scene != undefined) {
            act.scenes.push(scene);
            scene = undefined;
          }
          sceneNumber = parseInt(page.content[contentIndex + 2].str);
          scene = {
            sceneNumber,
            "startPosition": (page.pageInfo.num - 1) +  content.y / page.pageInfo.height,
            "elements": []
          }
          // console.log(page.content[contentIndex + 2].str)
          console.log("scene change to:", sceneNumber);
        }
      }
      if (sceneNumber != 0) {
        if (content.fontName == "g_d0_f36" && content.str.trim() !== "") {
          position = (page.pageInfo.num - 1) +  content.y / page.pageInfo.height
          addItemToScene(scene, content, page)
          console.log(content.str)
        }
      }
    }
    if (finished) {
      break;
    }
  }
  if (scene != undefined) {
    act.scenes.push(scene);
    scene = undefined;
  }

  if (act != undefined) {
    output.acts.push(act);
    act = undefined;
  }
  fs.writeFileSync(`output.json`, JSON.stringify(output, null, 2));
});


function addItemToScene(scene, content, page) {
  position = (page.pageInfo.num - 1) +  content.y / page.pageInfo.height
  let last_index = scene.elements.length - 1
  if (last_index >= 0) {
    if (Math.abs(scene.elements[last_index].position - position) <= 0.01) {
      console.log("on same line")
      scene.elements[last_index].str += " " + content.str;
      return;
    }
  }
  scene.elements.push({
    str: content.str,
    position
  })
}