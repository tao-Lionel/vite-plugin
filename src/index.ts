import type { PluginOption } from "vite";
import progress from "progress";
import rd from "rd";
import colors from "picocolors";
import { isExists, getCatchData, setCacheData } from "./cache";

export default function vitePluginTemplate(options?: object): PluginOption {
  const { cacheTransformCount, cacheChunkCount } = getCatchData();

  // 文件类型总数
  let fileCount = 0;
  // 转换的模块总数
  let transformCount = 0;
  // 当前已经转换的数量
  let transformed = 0;
  // 记录上一次进度条百分比
  let lastPercent = 0;
  let percent = 0;
  let chunkCount = 0;
  let bar: progress;
  let errInfo;

  return {
    // 插件名称
    name: "vite-plugin-template",

    // pre会比post 先执行
    enforce: "pre", // post
    // 指明它们仅在build 或 serve 模式时调用
    apply: "build", /// apply 也可以是一个函数

    // 1. vite 独有的钩子 可以在 vite 被解析之前修改 vite 的相关配置。钩子接收原始用户配置 config 和一个描述配置环境的变量env
    config(config, { command }) {
      console.log("这里是config钩子");
      if (command === "build") {
        // 初始化进度条
        options = {
          width: 40,
          complete: "\u2588",
          incomplete: "\u2591",
          ...options,
        };
        options.total = options?.total || 100;

        console.log("有没有缓存", isExists);

        const transforming = isExists ? `${colors.magenta("Transforms:")} :transformCur/:transformTotal | ` : "";
        const chunks = isExists ? `${colors.magenta("Chunks:")} :chunkCur/:chunkTotal | ` : "";
        const barText = `${colors.cyan(`[:bar]`)}`;

        const barFormat = options.format || `${colors.green("Bouilding")} ${barText} :percent | ${transforming}${chunks}Time: :elapseds`;

        delete options.format;
        bar = new progress(barFormat, options as ProgressBar.ProgressBarOptions);

        if (!isExists) {
          // 获取src下的文件总数
          const readDir = rd.readSync("src");
          const reg = /\.(vue|ts|js|jsx|tsx|css|scss||sass|styl|less)$/gi;
          readDir.forEach(item => reg.test(item) && fileCount++);
        }
      }
    },

    // 2. vite 独有的钩子 在解析 vite 配置后调用。使用这个钩子读取和存储最终解析的配置。当插件需要根据运行的命令做一些不同的事情时，它很有用
    configResolved(resolvedConfig) {
      console.log("这里是configResolved钩子");
    },

    // 4. vite 独有的钩子 主要用来配置开发服务器，为 dev-server (connect 应用程序) 添加自定义的中间件
    configureServer(server) {
      console.log("这里是configureServer钩子");
    },

    // vite 独有的钩子 转换 index.html 的专用钩子。钩子接收当前的 HTML 字符串和转换上下文
    transformIndexHtml(html) {
      console.log("这里是transformIndexHtml钩子");
    },

    //vite 独有的钩子 执行自定义HMR更新，可以通过ws往客户端发送自定义的事件；
    handleHotUpdate(ctx) {
      console.log("这里是handleHotUpdate钩子");
    },

    // 3. 构建阶段的通用钩子：在服务器启动时被调用：获取、操纵Rollup选项
    options(options) {},

    // 5. 构建阶段的通用钩子：在服务器启动时被调用：每次开始构建时调用
    buildStart(options) {},

    // 构建阶段的通用钩子：在每个传入模块请求时被调用：创建自定义确认函数，可以用来定位第三方依赖
    resolveId(source, importer, options) {},

    // 构建阶段的通用钩子：在每个传入模块请求时被调用：可以自定义加载器，可用来返回自定义的内容
    load(id) {},

    // 构建阶段的通用钩子：在每个传入模块请求时被调用：在每个传入模块请求时被调用，主要是用来转换单个模块
    transform(code, id) {
      transformCount++;
      if (!isExists) {
        const reg = /node_modules/gi;
        if (!reg.test(id) && percent < 0.25) {
          transformed++;
          // 百分比 = 当前已经转换的数量/文件总数
          percent = +(transformed / (fileCount * 2)).toFixed(2);
          percent < 0.8 && (lastPercent = percent);
        }

        if (percent >= 0.25 && lastPercent <= 0.65) {
          lastPercent = +(lastPercent + 0.001).toFixed(4);
        }
      }

      // 有缓存
      if (isExists) {
        runCachedData();
      }

      // 更新进度条
      bar.update(lastPercent, {
        transformTotal: cacheTransformCount,
        transformCur: transformCount,
        chunkTotal: cacheChunkCount,
        chunkCur: 0,
      });

      return {
        code,
        map: null,
      };
    },

    // 构建阶段的通用钩子：在构建结束后被调用，此处构建只是代表所有模块转义完成
    buildEnd(err) {
      errInfo = err;
    },

    // 输出阶段钩子通用钩子：接受输出参数
    outputOptions(options) {},

    // 输出阶段钩子通用钩子：每次bundle.generate 和 bundle.write调用时都会被触发。
    renderStart(outputOptions, inputOptions) {},

    // 输出阶段钩子通用钩子：用来给chunk增加hash
    augmentChunkHash(chunkInfo) {},

    // 输出阶段钩子通用钩子：转译单个的chunk时触发。rollup输出每一个chunk文件的时候都会调用。
    renderChunk(code, chunk, options) {
      chunkCount++;
      if (lastPercent <= 0.95) {
        isExists ? runCachedData() : (lastPercent = +(lastPercent + 0.005).toFixed(4));
      }
      return null;
    },

    // 输出阶段钩子通用钩子：在调用 bundle.write 之前立即触发这个hook
    generateBundle(options, bundle, isWrite) {},

    // 输出阶段钩子通用钩子：在调用 bundle.write后，所有的chunk都写入文件后，最后会调用一次 writeBundle
    writeBundle(options, bundle) {},

    // 通用钩子：在服务器关闭时被调用
    closeBundle() {
      if (!errInfo) {
        console.log("服务器关闭");
        // 关闭 progress
        bar.update(1);
        bar.terminate();

        // 缓存数据
        setCacheData({
          cacheTransformCount: transformCount,
          cacheChunkCount: chunkCount,
        });
      } else {
        console.log("err", errInfo);
      }
    },
  };

  // 缓存进度条计算
  function runCachedData() {
    if (transformCount === 1) {
      // stream.write("\n");

      bar.tick({
        transformTotal: cacheTransformCount,
        transformCur: transformCount,
        chunkTotal: cacheChunkCount,
        chunkCur: 0,
      });
    }

    transformed++;
    percent = lastPercent = +(transformed / (cacheTransformCount + cacheChunkCount)).toFixed(4);
  }
}
