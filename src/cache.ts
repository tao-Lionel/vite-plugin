import fs from "fs";
import path from "path";

const dirPath = path.join(process.cwd(), "node_modules", ".progress");
const filePath = path.join(dirPath, "index.json");

export interface ICacheData {
  // 转换的模块总数
  cacheTransformCount: number;
  // chunk的总数
  cacheChunkCount: number;
}

// 判断是否有缓存
export const isExists = fs.existsSync(filePath) || false;

// 获取缓存数据
export const getCatchData = (): ICacheData => {
  if (!isExists) {
    return {
      cacheTransformCount: 0,
      cacheChunkCount: 0,
    };
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

// 设置缓存数据
export const setCacheData = (data: ICacheData) => {
  !isExists && fs.mkdirSync(dirPath);
  fs.writeFileSync(filePath, JSON.stringify(data));
};
