import React, { useState } from "react";
import axios from "axios";
import './FileUploadConversion.css';
const PDFJS = require("pdfjs-dist/webpack");



function FileUpload() {

  const [fileData, setFileData] = useState("");
  const [imgSrc, setImgSrc] = useState("");

  const chunkNumber = 4;
  const availableAmbientColors = {
    "NoColor": {
      "colorCode": 0,
      "rgb": [0, 0, 0]
    },
    "Red": {
      "colorCode": 2,
      "rgb": [255, 0, 0]
    },
    "Pink": {
      "colorCode": 4,
      "rgb": [255, 0, 255]
    },
    "Purple": {
      "colorCode": 7,
      "rgb": [120, 90, 255]
    },
    "Blue": {
      "colorCode": 8,
      "rgb": [0, 0, 255]
    },
    "DarkPink": {
      "colorCode": 10,
      "rgb": [191, 53, 194]
    },
    "Turquoise": {
      "colorCode": 16,
      "rgb": [0, 255, 255]
    },
    "Grey": {
      "colorCode": 29,
      "rgb": [127, 124, 119]
    },
    "Green": {
      "colorCode": 32,
      "rgb": [0, 255, 0]
    },
    "White": {
      "colorCode": 33,
      "rgb": [192, 209, 232]
    },
    "CyanBlue": {
      "colorCode": 48,
      "rgb": [24, 155, 216]
    },
    "Azure": {
      "colorCode": 53,
      "rgb": [0, 124, 240]
    },
    "BabyBlue": {
      "colorCode": 56,
      "rgb": [62, 122, 186]
    },
    "BlueGrey": {
      "colorCode": 63,
      "rgb": [64, 81, 122]
    },
  }
  let colorCodebyImageId = {}

  const getFile = (e) => {
    setFileData(e.target.files[0]);
  };

  const readFileData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  };

  const getAvgColor = (canvasEl) => {
    var blockSize = 5 // only visit every 5 pixels
    var defaultRGB = {r:0,g:0,b:0} // for non-supporting envs
    var context = canvasEl.getContext && canvasEl.getContext('2d')
    var data, width, height, length
    var i = -4
    var rgb = {r:0,g:0,b:0}
    var count = 0

    if (!context) {
      return defaultRGB;
    }

    height = canvasEl.height;
    width = canvasEl.width;

    try {
      data = context.getImageData(0, 0, width, height); // returns RGBA values
    } catch(e) {
      /* security error, img on diff domain */alert('x');
      return defaultRGB;
    }
    length = data.data.length;

    while ( (i += blockSize * 4) < length ) {
      ++count; // total number of visited pixel
      rgb.r += data.data[i];  
      rgb.g += data.data[i+1];
      rgb.b += data.data[i+2];
  }
  // ~~ used to floor values
  rgb.r = ~~(rgb.r/count);
  rgb.g = ~~(rgb.g/count);
  rgb.b = ~~(rgb.b/count);
  var rgb_list = [rgb.r, rgb.g, rgb.b]
  return rgb_list;
  }


  async function loadImage(imageUrl) {
    let img;
    const imageLoadPromise = new Promise(resolve => {
        img = new Image();
        img.onload = resolve;
        img.src = imageUrl;
    });

    await imageLoadPromise;
    console.log("image loaded");
    return img;
}

  const getChangedColorsImgUrl = async (canvas, src_url) => {
    return loadImage(src_url).then(img => {
      const context = canvas.getContext("2d")
      canvas.height = img.height * 0.3;
      canvas.width = img.width * 0.3;
      context.drawImage(img, 0, 0, canvas.width * 0.3, canvas.height * 0.3)

      var data = context.getImageData(0, 0, canvas.width * 0.3, canvas.height * 0.3); 
      var length = data.data.length;
      var i = -4

      while ( (i += 4) < length ) {
        var rgb_value = [data.data[i], data.data[i+1], data.data[i+2]]
        var nearest_rgb_value = getNearestRGBValue(rgb_value)
        data.data[i] = nearest_rgb_value[0]
        data.data[i+1] = nearest_rgb_value[1]
        data.data[i+2] = nearest_rgb_value[2]
        // console.log("old rgb: " + rgb_value[0] + " " + rgb_value[1] + " " + rgb_value[2])
        // console.log("new rgb: " + data.data[i] + " " + data.data[i+1] + " " + data.data[i+2])
      } 
      context.putImageData(data, 0, 0) 
      var img_color_converted_url = canvas.toDataURL()
      return img_color_converted_url
    })
  }


  const getMostCommonColorCodeOfImage = async (canvas, src_url) => {
    const colorCountObj = {}
    // obj: { ${colorCode): int, $(colorCode): int}
    return loadImage(src_url).then(img => {
      const context = canvas.getContext("2d")
      canvas.height = img.height * 0.3;
      canvas.width = img.width * 0.3;
      context.drawImage(img, 0, 0, canvas.width * 0.3, canvas.height * 0.3)

      var data = context.getImageData(0, 0, canvas.width * 0.3, canvas.height * 0.3); 
      var length = data.data.length;
      var i = -4

      while ( (i += 4) < length ) {
        var rgb_value = [data.data[i], data.data[i+1], data.data[i+2]]
        var nearest_rgb_value = getNearestRGBValue(rgb_value)
        var colorCode = getColorCodeByRGB(nearest_rgb_value)
        if (!(colorCode in colorCountObj)) {
          colorCountObj[colorCode] = 0
        } else {
          colorCountObj[colorCode] = colorCountObj[colorCode] + 1
        }
        data.data[i] = nearest_rgb_value[0]
        data.data[i+1] = nearest_rgb_value[1]
        data.data[i+2] = nearest_rgb_value[2]

      } 
      let mostCommonColorCode = Object.keys(colorCountObj).reduce((a, b) => colorCountObj[a] > colorCountObj[b] ? a : b);

      // Debugging
      context.putImageData(data, 0, 0) 
      setImgSrc(canvas.toDataURL())
      // Debugging
      mostCommonColorCode = parseInt(mostCommonColorCode)
      console.log(mostCommonColorCode, typeof(mostCommonColorCode))
      return mostCommonColorCode
    })
  }

  const getNearestRGBValue = (rgb) => {
    var nearestRGB = [0, 0, 0]
    var minimDist
    var minimKey
    var currDist
    // calculate distance between input rgb and every available rgb in the rk
    for (var key in availableAmbientColors) {
      currDist = (availableAmbientColors[key]["rgb"][0]-rgb[0])**2 + (availableAmbientColors[key]["rgb"][1]-rgb[1])**2 + (availableAmbientColors[key]["rgb"][2]-rgb[2])**2
      if(minimDist < currDist && minimKey !== undefined && minimDist !== undefined) {
        nearestRGB = availableAmbientColors[minimKey]["rgb"]
      } else {
        nearestRGB = availableAmbientColors[key]["rgb"]
        minimDist = currDist
        minimKey = key
      }
    }
    return nearestRGB 
  }

  const areArraysIdentical = (a, b) => {
    if(a[0] === b[0] && a[1] === b[1] && a[2] === b[2]){
      return true
    } else {
      return false
    }
  }


  const getColorCodeByRGB = (rgb) => {
    var key = Object.keys(availableAmbientColors).find(key => 
      areArraysIdentical(availableAmbientColors[key]["rgb"], rgb))
    if (key) {
      return availableAmbientColors[key]["colorCode"]
    }
    return 0
  }


  //param: file -> the input file (e.g. event.target.files[0])
  //return: images -> an array of images encoded in base64 
  const convertPdfToImages = async (file) => {
    const images = [];
    const data = await readFileData(file);
    const pdf = await PDFJS.getDocument(data).promise;
    const canvas = document.createElement("canvas");
    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const viewport = page.getViewport({ scale: 1 });
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // SPLIT DATA URL IN 3 CHUNKS
      let stringLength = canvas.toDataURL().length
      let splitIndex = Math.round(stringLength/chunkNumber)
      let url = canvas.toDataURL()

      // get color converted img url
      let mostCommonColorCode = await getMostCommonColorCodeOfImage(canvas, url)
      colorCodebyImageId[i+1] = mostCommonColorCode

      let url_1 = url.slice(0, splitIndex)
      let url_2 = url.slice(splitIndex, splitIndex*2)
      let url_3 = url.slice(splitIndex*2, splitIndex*3)
      let url_4 = url.slice(splitIndex*3, stringLength)
      // images.push(canvas.toDataURL());
      images.push(url_1)
      images.push(url_2)
      images.push(url_3)
      images.push(url_4)
    }
    canvas.remove();
    return images;
  }

// const files_url ="http://localhost:8000/files/1";
// const images_url ="http://localhost:8000/images/";

const files_url = "https://incar-slides-api.onrender.com/files/1";
const images_url = "https://incar-slides-api.onrender.com/images";
const uploadFile = async (e) => {
  e.preventDefault();

  const data = await convertPdfToImages(fileData);
  const filename = fileData.name.slice(0, -4);

  try {
    // Fetch all entries and delete them
    const response = await axios.get(images_url);
    const entries = response.data;

    // Delete each object in the array
    const deletePromises = entries.map(entry => {
      const url = images_url + "/" + entry.id;
      return axios.delete(url);
    });

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);

    console.log('All objects deleted successfully');

    // Upload new images
    const axiosArray = data.map((imgUrl, index) => {
      let id = index + 1;
      let chunkId = (index % chunkNumber) + 1;
      let imageId = Math.floor(index / chunkNumber) + 1;
      let postData = {
        fileId: 1,
        imageUrl: imgUrl,
        id: id,
        imageId: imageId,
        chunkId: parseInt(chunkId)
      };

      if (!isNaN(Number(colorCodebyImageId[imageId]))) {
        postData.colorCode = parseInt(colorCodebyImageId[imageId]);
      }

      return axios.post(images_url, postData);
    });

    const responses = await axios.all(axiosArray);

    let allFilesUploaded = true;
    responses.forEach((res, index) => {
      if (res.status === 200 || res.status === 201) {
        console.log(`Successfully uploaded ${index + 1}`);
      } else {
        console.log('Error in upload', res);
        allFilesUploaded = false;
      }
    });

    if (allFilesUploaded) {
      alert('All files uploaded successfully!');
    } else {
      alert('Oop! Something went wrong with the upload :(');
    }
  } catch (error) {
    console.error('There was an error in the upload:', error);
    console.error('Server response:', error.response);
    alert('Oop! Something went wrong with the upload :(');
    return;
  }
};



/*
const uploadFile = async (e) => {
  e.preventDefault();

  const data = await convertPdfToImages(fileData)
  const filename = fileData.name.slice(0, -4)

  // Fetch all entries
  axios.get(images_url)
  .then(response => {
    const entries = response.data;  // assuming the data is in response.data

    // Create an array of promises for all delete operations
    const deletePromises = entries.map(entry => {
      // assuming the ID of each entry is in entry.id
      const url = images_url+ entry.id;
      return axios.delete(url);
    });

    // Wait for all delete operations to complete
    return Promise.all(deletePromises);
  })
  .then(() => {
    console.log('All entries deleted successfully');
  })
  .catch(error => {
    console.error('Error deleting entries:', error);
  });
    
  try {
    const putRes = await axios.put(files_url, {
      filename: filename,
      slideCount: data.length / chunkNumber
    });

    if(putRes.status !== 200){
      alert("Oop! Something went wrong with the upload :(");
      return;
    }
    
    let id = 1;
    let chunkId = 1;
    let imageId = 1;

    const axiosArray = data.map((imgUrl, index) => {
      let postData = {};
      postData["fileId"] = 1;
      postData["imageUrl"] = imgUrl;
      postData["id"] = id;
      postData["imageId"] = imageId;
      postData["chunkId"] = parseInt(chunkId);
      if (!isNaN(Number(colorCodebyImageId[postData["imageId"]]))) {
        postData["colorCode"] = parseInt(colorCodebyImageId[postData["imageId"]]);
      }
      postData["colorCode"] = colorCodebyImageId[imageId];

      chunkId++
      id++
      if(chunkId === (chunkNumber + 1)) {
        imageId++
        chunkId = 1;
      }

      return axios.post(images_url, postData);
    });
    

    const responses = await axios.all(axiosArray);
    responses.forEach(res => console.log('Success'));
    console.log('submitted all axios calls');
    alert("Successfully submitted!");
  } catch(error) {
    alert("Something went Wrong :(");
    console.log(error);
  }
};

*/
  return (
    <form name="uploadForm" onSubmit={uploadFile}>
      <input type="file" className="fileInput" name="file" onChange={getFile} accept=".pdf" required />
      <br></br>
      <input type="submit" className="upload" name="upload" value="Upload" />
      <img id="image" src={imgSrc}></img>
    </form>    
  );
}

export default FileUpload;