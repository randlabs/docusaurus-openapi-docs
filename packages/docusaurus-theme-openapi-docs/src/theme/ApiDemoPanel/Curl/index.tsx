import React, { useState, useEffect, useRef } from "react";

import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import codegen from "@paloaltonetworks/postman-code-generators";
import sdk from "@paloaltonetworks/postman-collection";
import CodeBlock from "@theme/CodeBlock";
import clsx from "clsx";
import JSONFormatter from "json-formatter-js";

import CodeTabs from "../CodeTabs";
import { useTypedSelector } from "../hooks";
import buildPostmanRequest from "./../buildPostmanRequest";
import { cURL_to_fetch } from "./curl_to_fetch.js";
import styles from "./styles.module.css";

interface Language {
  highlight?: string;
  language: string;
  logoClass?: string;
  variant?: string;
  options?: { [key: string]: boolean };
  source?: string;
}

type ResponseOption = "collapsable" | "raw";
type ResponsedState = "no" | "success" | "error";

export const languageSet: Language[] = [
  {
    highlight: "bash",
    language: "curl",
    logoClass: "bash",
    options: {
      longFormat: false,
      followRedirect: true,
      trimRequestBody: true,
    },
    variant: "cURL",
  },
  {
    highlight: "python",
    language: "python",
    logoClass: "python",
    options: {
      followRedirect: true,
      trimRequestBody: true,
    },
    variant: "requests",
  },
  {
    highlight: "go",
    language: "go",
    logoClass: "go",
    options: {
      followRedirect: true,
      trimRequestBody: true,
    },
    variant: "native",
  },
  {
    highlight: "javascript",
    language: "nodejs",
    logoClass: "nodejs",
    options: {
      ES6_enabled: true,
      followRedirect: true,
      trimRequestBody: true,
    },
    variant: "axios",
  },
  // {
  //   highlight: "ruby",
  //   language: "ruby",
  //   logoClass: "ruby",
  //   options: {
  //     followRedirect: true,
  //     trimRequestBody: true,
  //   },
  //   variant: "Net::HTTP",
  // },
  // {
  //   highlight: "csharp",
  //   language: "csharp",
  //   logoClass: "csharp",
  //   options: {
  //     followRedirect: true,
  //     trimRequestBody: true,
  //   },
  //   variant: "RestSharp",
  // },
  // {
  //   highlight: "php",
  //   language: "php",
  //   logoClass: "php",
  //   options: {
  //     followRedirect: true,
  //     trimRequestBody: true,
  //   },
  //   variant: "cURL",
  // },
];

interface Props {
  postman: sdk.Request;
  codeSamples: any; // TODO: Type this...
}

function CodeTab({ children, hidden, className, onClick }: any): JSX.Element {
  return (
    <div
      role="tabpanel"
      className={clsx(styles.tabItem, className)}
      {...{ hidden }}
    >
      {children}
    </div>
  );
}

function Curl({ postman, codeSamples }: Props) {
  // TODO: match theme for vscode.

  const collapsableRef = useRef<HTMLDivElement>(null);
  const [rawResponse, setRawResponse] = useState("");
  const [responseOption, setResponseOption] =
    useState<ResponseOption>("collapsable");
  const [isLoading, setIsLoading] = useState(false);

  const { siteConfig } = useDocusaurusContext();

  const contentType = useTypedSelector((state) => state.contentType.value);
  const accept = useTypedSelector((state) => state.accept.value);
  const server = useTypedSelector((state) => state.server.value);
  const body = useTypedSelector((state) => state.body);

  const pathParams = useTypedSelector((state) => state.params.path);
  const queryParams = useTypedSelector((state) => state.params.query);
  const cookieParams = useTypedSelector((state) => state.params.cookie);
  const headerParams = useTypedSelector((state) => state.params.header);

  const auth = useTypedSelector((state) => state.auth);

  // TODO
  const langs = [
    ...((siteConfig?.themeConfig?.languageTabs as Language[] | undefined) ??
      languageSet),
    ...codeSamples,
  ];

  const defaultLang: Language[] = languageSet.filter(
    (lang) =>
      lang.language === localStorage.getItem("docusaurus.tab.code-samples")
  );

  const [language, setLanguage] = useState(() => {
    if (langs.length === 1) {
      return langs[0];
    }
    return defaultLang[0] ?? langs[0];
  });

  const [codeText, setCodeText] = useState("");
  const [curlCodeText, setCurlCodeText] = useState("");
  const [responseState, setResponseState] = useState<ResponsedState>("no");

  useEffect(() => {
    if (language && !!language.options) {
      const postmanRequest = buildPostmanRequest(postman, {
        queryParams,
        pathParams,
        cookieParams,
        contentType,
        accept,
        headerParams,
        body,
        server,
        auth,
      });

      codegen.convert(
        languageSet[0].language,
        languageSet[0].variant,
        postmanRequest,
        languageSet[0].options,
        (error: any, snippet: string) => {
          if (error) {
            return;
          }
          setCurlCodeText(snippet);
        }
      );

      codegen.convert(
        language.language,
        language.variant,
        postmanRequest,
        language.options,
        (error: any, snippet: string) => {
          if (error) {
            return;
          }
          setCodeText(snippet);
        }
      );
    } else if (language && !!language.source) {
      setCodeText(language.source);
    } else if (language && !language.options) {
      const langSource = languageSet.filter(
        (lang) => lang.language === language.language
      );

      // Merges user-defined language with default languageSet
      // This allows users to define only the minimal properties necessary in languageTabs
      // User-defined properties should override languageSet properties
      const mergedLanguage = { ...langSource[0], ...language };
      const postmanRequest = buildPostmanRequest(postman, {
        queryParams,
        pathParams,
        cookieParams,
        contentType,
        accept,
        headerParams,
        body,
        server,
        auth,
      });

      codegen.convert(
        mergedLanguage.language,
        mergedLanguage.variant,
        postmanRequest,
        mergedLanguage.options,
        (error: any, snippet: string) => {
          if (error) {
            return;
          }
          setCodeText(snippet);
        }
      );
    } else {
      setCodeText("");
    }
  }, [
    defaultLang,
    accept,
    body,
    contentType,
    cookieParams,
    headerParams,
    language,
    pathParams,
    postman,
    queryParams,
    server,
    auth,
  ]);

  const handleRequest = async () => {
    setIsLoading(true);
    try {
      const fetchText = cURL_to_fetch(curlCodeText, false);
      const firstResponse = await eval(`${fetchText}`); // eslint-disable-line
      const response = await firstResponse.json();
      setResponseState("success");

      const formatter = new JSONFormatter(response);

      if (collapsableRef.current) {
        collapsableRef.current.innerHTML = "";
        collapsableRef.current.appendChild(formatter.render());
      }
      setRawResponse(JSON.stringify(response, null, 4));
    } catch (e) {
      console.log("error on request", e);
      setResponseState("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (language === undefined) {
    return null;
  }

  return (
    <>
      <CodeTabs groupId="code-samples" action={setLanguage}>
        {langs.map((lang) => {
          return (
            <CodeTab
              value={lang.language}
              label={""}
              key={
                lang.variant
                  ? `${lang.language}-${lang.variant}`
                  : lang.language
              }
              attributes={{ className: `code__tab--${lang.logoClass}` }}
            >
              <CodeBlock language={lang.highlight}>{codeText}</CodeBlock>
            </CodeTab>
          );
        })}
      </CodeTabs>

      <div>
        <button
          className={clsx(styles.executeButton_fetch)}
          onClick={handleRequest}
        >
          {isLoading ? (
            <div className={clsx(styles.response_loader)} />
          ) : (
            "Execute request"
          )}
        </button>

        <div
          className={clsx(styles.execute_result)}
          style={{ display: responseState !== "no" ? "flex" : "none" }}
        >
          <div className={clsx(styles.executeOptions)}>
            <div
              onClick={() => setResponseOption("collapsable")}
              className={clsx(
                styles.executeOption,
                responseOption === "collapsable" && styles.executeOptionSelected
              )}
            >
              Collapsable
            </div>
            <div
              onClick={() => setResponseOption("raw")}
              className={clsx(
                styles.executeOption,
                responseOption === "raw" && styles.executeOptionSelected
              )}
            >
              Raw
            </div>
          </div>

          <div
            style={{ display: responseState === "success" ? "block" : "none" }}
            className={clsx(styles.executeResponseText)}
          >
            {responseOption === "raw" && (
              <CodeBlock
                className={clsx(styles.noMarginBottom)}
                language="json"
              >
                {rawResponse}
              </CodeBlock>
            )}
          </div>

          <div
            className={clsx(styles.executeResponseText)}
            ref={collapsableRef}
            style={{
              display: responseOption === "collapsable" ? "block" : "none",
            }}
          />
        </div>
      </div>
    </>
  );
}

export default Curl;
