import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs";

const oldInput = document.getElementById("oldPdf");
const newInput = document.getElementById("newPdf");
const sensitivityInput = document.getElementById("sensitivity");
const sensitivityValue = document.getElementById("sensitivityValue");
const showAllInput = document.getElementById("showAll");
const compareBtn = document.getElementById("compareBtn");
const reportList = document.getElementById("reportList");
const viewer = document.getElementById("viewer");

sensitivityInput.addEventListener("input", () => {
  sensitivityValue.textContent = sensitivityInput.value;
});

compareBtn.addEventListener("click", async () => {
  if (!oldInput.files[0] || !newInput.files[0]) {
    alert("旧PDFと新PDFの両方を選択してください。");
    return;
  }

  compareBtn.disabled = true;
  compareBtn.textContent = "比較中...";
  reportList.innerHTML = "";
  viewer.innerHTML = "";

  try {
    const oldPdf = await loadPdf(oldInput.files[0]);
    const newPdf = await loadPdf(newInput.files[0]);
    const totalPages = Math.max(oldPdf.numPages, newPdf.numPages);
    const threshold = Number(sensitivityInput.value) * 2.55;
    const showAll = showAllInput.checked;

    let diffPages = 0;

    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      const oldCanvas = await renderPage(oldPdf, pageIndex);
      const newCanvas = await renderPage(newPdf, pageIndex);

      if (!oldCanvas || !newCanvas) {
        appendReport(`ページ ${pageIndex}: 片方にのみ存在`);
        if (showAll) {
          drawRow(pageIndex, oldCanvas, newCanvas, null);
        }
        diffPages += 1;
        continue;
      }

      const { overlayCanvas, changedPixels, ratio } = buildDiffOverlay(oldCanvas, newCanvas, threshold);
      const hasDiff = changedPixels > 0;

      if (hasDiff) {
        diffPages += 1;
        appendReport(`ページ ${pageIndex}: 差分あり（約 ${(ratio * 100).toFixed(2)}%）`);
      } else {
        appendReport(`ページ ${pageIndex}: 差分なし`);
      }

      if (showAll || hasDiff) {
        drawRow(pageIndex, oldCanvas, newCanvas, overlayCanvas);
      }
    }

    if (totalPages === 0) {
      appendReport("比較対象ページが見つかりませんでした。");
    } else {
      appendReport(`完了: ${totalPages}ページ中 ${diffPages}ページに差分を検出。`);
    }
  } catch (error) {
    console.error(error);
    appendReport(`エラー: ${error.message}`);
  } finally {
    compareBtn.disabled = false;
    compareBtn.textContent = "差分を検出";
  }
});

async function loadPdf(file) {
  const buffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: buffer }).promise;
}

async function renderPage(pdf, pageNum) {
  if (!pdf || pageNum > pdf.numPages) {
    return null;
  }

  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.3 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

function buildDiffOverlay(oldCanvas, newCanvas, threshold) {
  const width = Math.min(oldCanvas.width, newCanvas.width);
  const height = Math.min(oldCanvas.height, newCanvas.height);

  const offOld = document.createElement("canvas");
  offOld.width = width;
  offOld.height = height;
  const offNew = document.createElement("canvas");
  offNew.width = width;
  offNew.height = height;

  offOld.getContext("2d").drawImage(oldCanvas, 0, 0, width, height);
  offNew.getContext("2d").drawImage(newCanvas, 0, 0, width, height);

  const oldData = offOld.getContext("2d").getImageData(0, 0, width, height);
  const newData = offNew.getContext("2d").getImageData(0, 0, width, height);
  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  const overlayCtx = overlayCanvas.getContext("2d");
  const overlayData = overlayCtx.createImageData(width, height);

  let changedPixels = 0;
  for (let i = 0; i < oldData.data.length; i += 4) {
    const dr = Math.abs(oldData.data[i] - newData.data[i]);
    const dg = Math.abs(oldData.data[i + 1] - newData.data[i + 1]);
    const db = Math.abs(oldData.data[i + 2] - newData.data[i + 2]);
    const delta = (dr + dg + db) / 3;

    if (delta > threshold) {
      overlayData.data[i] = 255;
      overlayData.data[i + 1] = 0;
      overlayData.data[i + 2] = 0;
      overlayData.data[i + 3] = 180;
      changedPixels += 1;
    } else {
      overlayData.data[i + 3] = 0;
    }
  }

  overlayCtx.putImageData(overlayData, 0, 0);
  return { overlayCanvas, changedPixels, ratio: changedPixels / (width * height) };
}

function drawRow(pageNum, oldCanvas, newCanvas, overlayCanvas) {
  const row = document.createElement("div");
  row.className = "page-row";

  row.appendChild(buildPanel(`旧PDF - ページ ${pageNum}`, oldCanvas));
  row.appendChild(buildPanel(`新PDF - ページ ${pageNum}`, newCanvas, overlayCanvas));

  viewer.appendChild(row);
}

function buildPanel(title, baseCanvas, overlayCanvas = null) {
  const panel = document.createElement("article");
  panel.className = "panel";
  panel.innerHTML = `<h3>${title}</h3>`;

  const wrap = document.createElement("div");
  wrap.className = "canvas-wrap";

  if (baseCanvas) {
    wrap.appendChild(baseCanvas);
  } else {
    const empty = document.createElement("p");
    empty.textContent = "このページは存在しません";
    empty.style.padding = "8px";
    wrap.appendChild(empty);
  }

  if (overlayCanvas) {
    overlayCanvas.className = "overlay";
    wrap.appendChild(overlayCanvas);
  }

  panel.appendChild(wrap);
  return panel;
}

function appendReport(text) {
  const item = document.createElement("li");
  item.textContent = text;
  reportList.appendChild(item);
}
