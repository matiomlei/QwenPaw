import { memo, useMemo } from "react";
import {
  Bubble,
  DefaultCards,
} from "@agentscope-ai/chat";
import { Avatar, Flex } from "antd";
import AgentScopeRuntimeResponseBuilder from "@agentscope-ai/chat/lib/AgentScopeRuntimeWebUI/core/AgentScopeRuntime/Response/Builder";
import Actions from "@agentscope-ai/chat/lib/AgentScopeRuntimeWebUI/core/AgentScopeRuntime/Response/Actions";
import Error from "@agentscope-ai/chat/lib/AgentScopeRuntimeWebUI/core/AgentScopeRuntime/Response/Error";
import Reasoning from "@agentscope-ai/chat/lib/AgentScopeRuntimeWebUI/core/AgentScopeRuntime/Response/Reasoning";
import Tool from "@agentscope-ai/chat/lib/AgentScopeRuntimeWebUI/core/AgentScopeRuntime/Response/Tool";
import { useChatAnywhereOptions } from "@agentscope-ai/chat/lib/AgentScopeRuntimeWebUI/core/Context/ChatAnywhereOptionsContext";
import {
  AgentScopeRuntimeContentType,
  AgentScopeRuntimeMessageType,
  AgentScopeRuntimeRunStatus,
  type IAgentScopeRuntimeMessage,
  type IAgentScopeRuntimeResponse,
} from "@agentscope-ai/chat/lib/AgentScopeRuntimeWebUI/core/AgentScopeRuntime/types";
import { OpenUIMessageContent } from "./OpenUIMessageContent";

function formatMediaUrl(
  url: string | undefined,
  replaceMediaURL?: (url: string) => string,
): string | undefined {
  if (!url) return url;
  return replaceMediaURL?.(url) || url;
}

const ResponseMessage = memo(function ResponseMessage({
  data,
}: {
  data: IAgentScopeRuntimeMessage;
}) {
  const replaceMediaURL = useChatAnywhereOptions(
    (value: any) => value.api?.replaceMediaURL,
  ) as ((url: string) => string) | undefined;

  if (!data.content?.length) return null;

  return (
    <>
      {data.content.map((item, index) => {
        switch (item.type) {
          case AgentScopeRuntimeContentType.TEXT:
            return (
              <OpenUIMessageContent
                key={index}
                content={item.text}
                isStreaming={item.status === AgentScopeRuntimeRunStatus.InProgress}
              />
            );
          case AgentScopeRuntimeContentType.REFUSAL:
            return (
              <OpenUIMessageContent
                key={index}
                content={item.refusal}
              />
            );
          case AgentScopeRuntimeContentType.IMAGE:
            return (
              <DefaultCards.Images
                key={index}
                data={[
                  {
                    url:
                      formatMediaUrl(item.image_url, replaceMediaURL) || "",
                  },
                ]}
              />
            );
          case AgentScopeRuntimeContentType.VIDEO:
            return (
              <DefaultCards.Videos
                key={index}
                data={[
                  {
                    src:
                      formatMediaUrl(item.video_url, replaceMediaURL) || "",
                    poster: formatMediaUrl(
                      item.video_poster,
                      replaceMediaURL,
                    ),
                  },
                ]}
              />
            );
          case AgentScopeRuntimeContentType.FILE:
            return (
              <DefaultCards.Files
                key={index}
                data={[
                  {
                    url: formatMediaUrl(item.file_url, replaceMediaURL),
                    name: item.file_name || item.fileName || item.file_id,
                    size: item.file_size,
                  },
                ]}
              />
            );
          case AgentScopeRuntimeContentType.AUDIO:
            return (
              <DefaultCards.Audios
                key={index}
                data={[
                  {
                    src:
                      formatMediaUrl(
                        item.audio_url || item.data,
                        replaceMediaURL,
                      ) || "",
                  },
                ]}
              />
            );
          default:
            return <div key={index}>{JSON.stringify(item)}</div>;
        }
      })}
    </>
  );
});

export default function OpenUIResponseCard(props: {
  data: IAgentScopeRuntimeResponse;
  isLast?: boolean;
}) {
  const avatar = useChatAnywhereOptions((value: any) => value.welcome.avatar) as
    | string
    | undefined;
  const nick = useChatAnywhereOptions((value: any) => value.welcome.nick) as
    | string
    | undefined;

  const messages = useMemo(() => {
    return AgentScopeRuntimeResponseBuilder.mergeToolMessages(
      props.data.output,
    );
  }, [props.data.output]);

  if (!messages?.length && AgentScopeRuntimeResponseBuilder.maybeGenerating(props.data)) {
    return <Bubble.Spin />;
  }

  return (
    <>
      {avatar && (
        <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
          <Avatar src={avatar} />
          {nick && <span>{nick}</span>}
        </Flex>
      )}
      {messages.map((item) => {
        switch (item.type) {
          case AgentScopeRuntimeMessageType.MESSAGE:
            return <ResponseMessage key={item.id} data={item} />;
          case AgentScopeRuntimeMessageType.PLUGIN_CALL:
          case AgentScopeRuntimeMessageType.PLUGIN_CALL_OUTPUT:
          case AgentScopeRuntimeMessageType.MCP_CALL:
          case AgentScopeRuntimeMessageType.MCP_CALL_OUTPUT:
            return <Tool key={item.id} data={item} />;
          case AgentScopeRuntimeMessageType.MCP_APPROVAL_REQUEST:
            return <Tool key={item.id} data={item} isApproval />;
          case AgentScopeRuntimeMessageType.REASONING:
            return <Reasoning key={item.id} data={item} />;
          case AgentScopeRuntimeMessageType.ERROR:
            return <Error key={item.id} data={item} />;
          case AgentScopeRuntimeMessageType.HEARTBEAT:
            return null;
          default:
            console.warn(`[WIP] Unknown message type: ${item.type}`);
            return null;
        }
      })}
      {props.data.error && <Error data={props.data.error} />}
      <Actions {...props} />
    </>
  );
}
